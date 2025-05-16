const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const fs = require('fs');
const ejs = require('ejs');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// Настройка view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const dbPath = path.join(__dirname, 'database.db');
console.log('Путь к базе данных:', dbPath);

// Проверяем существование базы данных
if (fs.existsSync(dbPath)) {
    console.log('База данных существует');
    // Сделаем резервную копию при запуске
    fs.copyFileSync(dbPath, `${dbPath}.backup`);
} else {
    console.log('База данных не существует, будет создана новая');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настраиваем сессии через PostgreSQL
const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(session({
    store: new pgSession({
        pool: pgPool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: true,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        console.log('Загрузка файла...');
        const uploadDir = path.join(__dirname, 'uploads');
        
        // Создаем основную директорию uploads, если её нет
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
            console.log('Создана директория uploads');
        }
        
        // Определяем тип файла и соответствующую поддиректорию
        const type = file.fieldname === 'trainerImage' ? 'trainers' : 
                    (file.mimetype.startsWith('image/') ? 'images' : 'videos');
        
        const typeDir = path.join(uploadDir, type);
        
        // Создаем поддиректорию, если её нет
        if (!fs.existsSync(typeDir)) {
            fs.mkdirSync(typeDir, { recursive: true });
            console.log(`Создана поддиректория ${type}`);
        }
        
        console.log('Путь для сохранения:', typeDir);
        cb(null, typeDir);
    },
    filename: function(req, file, cb) {
        const filename = Date.now() + '-' + file.originalname;
        console.log('Сохраняем файл как:', filename);
        cb(null, filename);
    }
});

const upload = multer({ storage: storage });

// Настраиваем статическую раздачу файлов из uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Добавьте эту строку после других middleware
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Добавляем middleware для проверки авторизации
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login.html');
    }
};

// Middleware для проверки прав администратора
function requireAdmin(req, res, next) {
    console.log('Проверка прав администратора:', req.session);
    
    if (!req.session || !req.session.userId) {
        console.log('Доступ запрещен: не авторизован');
        return res.status(403).json({ error: 'Доступ запрещен' });
    }

    // Проверяем is_admin как булево значение
    if (!req.session.isAdmin) {
        console.log('Доступ запрещен: не админ');
        return res.status(403).json({ error: 'Доступ запрещен' });
    }

    next();
}

// Middleware для логирования всех запросов
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});

// Инициализация таблиц
pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err, result) => {
    if (err) console.error('Ошибка создания таблицы users:', err);
    else console.log('Таблица users готова');
});

pgPool.query(`
    CREATE TABLE IF NOT EXISTS applications (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        schedule_date TEXT,
        schedule_time TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        user_id INTEGER REFERENCES users(id),
        user_username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err, result) => {
    if (err) console.error('Ошибка создания таблицы applications:', err);
    else console.log('Таблица applications готова');
});

pgPool.query(`
    CREATE TABLE IF NOT EXISTS gallery (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err, result) => {
    if (err) console.error('Ошибка создания таблицы gallery:', err);
    else console.log('Таблица gallery готова');
});

pgPool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`, (err, result) => {
    if (err) {
        console.error('Ошибка создания таблицы reviews:', err);
    } else {
        console.log('Таблица reviews создана или уже существует');
    }
});

// Добавляем обработку ошибок для EJS
app.use((err, req, res, next) => {
    console.error('Ошибка EJS:', err);
    res.status(500).send('Ошибка сервера при рендеринге страницы');
});

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Проверка наличия необходимых переменных окружения
const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error('Отсутствуют необходимые переменные окружения:', missingEnvVars.join(', '));
    process.exit(1);
}

// Настройка Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Главная страница через EJS
app.get('/', async (req, res) => {
    console.log('Обработка запроса к главной странице');
    try {
        const [trainersResult, blocksResult] = await Promise.all([
            pgPool.query('SELECT * FROM trainers ORDER BY created_at DESC'),
            pgPool.query('SELECT * FROM blocks WHERE page_slug = $1 ORDER BY position, id', ['main'])
        ]);
        const trainers = trainersResult.rows;
        const mainBlocks = blocksResult.rows;
        console.log('Рендеринг главной страницы с тренерами:', trainers.length, 'и блоками:', mainBlocks.length);
        res.render('index', {
            trainers,
            mainBlocks,
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    } catch (err) {
        console.error('Ошибка при получении тренеров или блоков:', err);
        res.render('index', { trainers: [], mainBlocks: [] });
    }
});

// Маршрут для загрузки файла в галерею
app.post('/api/gallery/upload', upload.single('mediaFile'), async (req, res) => {
    const { mediaTitle, mediaDescription, mediaType, mediaUrl } = req.body;
    let fileUrl = '';
    try {
        if (mediaType === 'image') {
            if (!req.file) {
                return res.status(400).json({ error: 'Файл не загружен' });
            }
            // Загрузка на Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'gallery'
            });
            fileUrl = result.secure_url;
            // Удаляем локальный файл после загрузки
            fs.unlinkSync(req.file.path);
        } else if (mediaType === 'video') {
            if (!mediaUrl) {
                return res.status(400).json({ error: 'URL видео не указан' });
            }
            fileUrl = mediaUrl;
        } else {
            return res.status(400).json({ error: 'Неверный тип медиа' });
        }
        const dbResult = await pgPool.query(
            'INSERT INTO gallery (title, description, type, url) VALUES ($1, $2, $3, $4) RETURNING id',
            [mediaTitle, mediaDescription, mediaType, fileUrl]
        );
        res.json({ success: true, id: dbResult.rows[0].id });
    } catch (err) {
        console.error('Ошибка при загрузке в галерею:', err);
        res.status(500).json({ error: err.message });
    }
});

// API для галереи (получение всех файлов)
app.get('/api/gallery', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM gallery ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Страница галереи
app.get('/gallery', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM gallery ORDER BY created_at DESC');
        res.render('gallery', {
            galleryItems: result.rows,
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    } catch (err) {
        res.render('gallery', {
            galleryItems: [],
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    }
});

// Удаление элемента галереи
app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    console.log('Попытка удаления элемента галереи с ID:', id);
    try {
        // Получаем информацию о файле
        const rowResult = await pgPool.query('SELECT url FROM gallery WHERE id = $1', [id]);
        const row = rowResult.rows[0];
        if (!row) {
            console.log('Файл не найден в БД');
            return res.status(404).json({ error: 'Файл не найден' });
        }
        console.log('Найден файл для удаления:', row.url);
        // Удаляем запись из БД
        await pgPool.query('DELETE FROM gallery WHERE id = $1', [id]);
        // Удаляем файл
        const filePath = path.join(__dirname, row.url.replace(/^\/uploads\//, ''));
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error('Ошибка при удалении файла:', err);
            // Продолжаем выполнение, даже если файл не удалось удалить
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при удалении элемента галереи:', err);
        res.status(500).json({ error: err.message });
    }
});

// Маршруты для галереи
app.post('/api/gallery/upload', upload.single('mediaFile'), (req, res) => {
    console.log('Получен запрос на загрузку файла в галерею');
    console.log('Файл:', req.file);
    console.log('Тело запроса:', req.body);

    if (!req.file) {
        return res.status(400).json({ error: 'Файл не загружен' });
    }

    const { mediaTitle, mediaDescription, mediaType } = req.body;
    const fileUrl = `/uploads/${mediaType === 'image' ? 'images' : 'videos'}/${req.file.filename}`;

    pgPool.query(
        'INSERT INTO gallery (title, description, type, url) VALUES ($1, $2, $3, $4) RETURNING id',
        [mediaTitle, mediaDescription, mediaType, fileUrl],
        (err, result) => {
            if (err) {
                console.error('Ошибка при сохранении в БД:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: result.rows[0].id });
        }
    );
});

// Маршрут для получения всех заявок (applications)
app.get('/api/applications', async (req, res) => {
    console.log('Запрос на получение всех записей');
    const sql = `
        SELECT a.*, 
               COALESCE(u.username, a.user_username, 'Неизвестен') as username
        FROM applications a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
    `;
    try {
        const result = await pgPool.query(sql);
        console.log('Получено записей:', result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении записей:', err);
        res.status(500).json({ error: err.message });
    }
});

// Маршрут для получения заявок пользователя
app.get('/api/applications/user', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Не авторизован' });
    }
    const sql = `
        SELECT * FROM applications 
        WHERE user_id = $1 
        ORDER BY created_at DESC
    `;
    try {
        const result = await pgPool.query(sql, [req.session.userId]);
        console.log(`Получено записей для пользователя ${req.session.userId}:`, result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении записей пользователя:', err);
        res.status(500).json({ error: err.message });
    }
});

// Маршрут для создания новой заявки
app.post('/api/applications', async (req, res) => {
    console.log('Получен запрос на создание записи:', req.body);
    console.log('Данные сессии:', req.session);

    if (!req.session.userId) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    const { name, phone, email, schedule_date, schedule_time, message } = req.body;
    
    if (!name || !phone || !email || !schedule_date || !schedule_time) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    const userId = req.session.userId;
    const username = req.session.username || 'Неизвестен';

    const sql = `
        INSERT INTO applications (
            name, phone, email, schedule_date, schedule_time, 
            message, user_id, user_username, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id
    `;
    try {
        const result = await pgPool.query(sql, [name, phone, email, schedule_date, schedule_time, message, userId, username]);
        console.log('Запись успешно создана с ID:', result.rows[0].id);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Ошибка при сохранении записи:', err);
        res.status(500).json({ error: 'Ошибка при сохранении заявки' });
    }
});

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Проверяем, существует ли пользователь
        const userResult = await pgPool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (userResult.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(password, 10);
        // Сохраняем пользователя
        const insertResult = await pgPool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );
        res.json({
            success: true,
            message: 'Регистрация успешна',
            id: insertResult.rows[0].id
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при создании пользователя' });
    }
});

// Логин пользователя
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await pgPool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0];
        if (user && await bcrypt.compare(password, user.password)) {
            console.log('Пользователь найден:', user);
            req.session.userId = user.id;
            req.session.isAdmin = Boolean(user.is_admin);
            req.session.username = user.username;
            
            // Сохраняем сессию явно
            req.session.save((err) => {
                if (err) {
                    console.error('Ошибка сохранения сессии:', err);
                }
                console.log('Сессия после входа:', req.session);
                res.json({
                    success: true,
                    isAdmin: req.session.isAdmin,
                    username: user.username
                });
            });
        } else {
            res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Получение информации о пользователе
app.get('/api/user/info', requireAuth, async (req, res) => {
    try {
        const userResult = await pgPool.query('SELECT username FROM users WHERE id = $1', [req.session.userId]);
        const user = userResult.rows[0];
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API для получения списка тренеров
app.get('/api/trainers', async (req, res) => {
    console.log('Запрос на получение списка тренеров');
    try {
        const result = await pgPool.query('SELECT * FROM trainers ORDER BY created_at DESC');
        console.log('Найдено тренеров:', result.rows.length);
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении тренеров:', err);
        res.status(500).json({ error: err.message });
    }
});

// Обработчик для загрузки изображения тренера
app.post('/api/trainers', upload.single('trainerImage'), async (req, res) => {
    console.log('Получен запрос на добавление тренера');
    console.log('Файл:', req.file);
    console.log('Данные формы:', req.body);

    if (!req.file) {
        return res.status(400).json({ error: 'Изображение не загружено' });
    }

    const { name, description } = req.body;

    if (!name || !description) {
        return res.status(400).json({ error: 'Не все поля заполнены' });
    }

    try {
        // Загрузка на Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'trainers'
        });

        // Удаляем локальный файл после загрузки
        fs.unlinkSync(req.file.path);

        const imageUrl = result.secure_url;

        const dbResult = await pgPool.query(
            'INSERT INTO trainers (name, description, image_url) VALUES ($1, $2, $3) RETURNING *',
            [name, description, imageUrl]
        );
        const trainer = dbResult.rows[0];
        console.log('Тренер успешно добавлен с ID:', trainer.id);
        res.json({
            success: true,
            id: trainer.id,
            trainer
        });
    } catch (err) {
        console.error('Ошибка при добавлении тренера:', err);
        res.status(500).json({ error: err.message });
    }
});

// Создаем админа при первом запуске
pgPool.query('SELECT * FROM users WHERE username = $1', ['admin'], async (err, result) => {
    if (err) {
        console.error('Ошибка при проверке существования админа:', err);
        return;
    }
    
    if (!result || result.rows.length === 0) {
        try {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await pgPool.query(
                'INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3)',
                ['admin', hashedPassword, true]
            );
            console.log('Админ успешно создан');
        } catch (err) {
            console.error('Ошибка при создании админа:', err);
        }
    }
});

// API для изменения роли пользователя
app.post('/api/users/:userId/role', requireAdmin, async (req, res) => {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    try {
        await pgPool.query(
            'UPDATE users SET is_admin = $1 WHERE id = $2',
            [isAdmin, userId]
        );
        res.json({ success: true, message: 'Роль пользователя успешно обновлена' });
    } catch (error) {
        console.error('Ошибка при обновлении роли пользователя:', error);
        res.status(500).json({ error: 'Ошибка при обновлении роли пользователя' });
    }
});

// Обновленный API для получения всех записей (для админки)
app.get('/admin', requireAdmin, (req, res) => {
    res.render('admin');
});

// Добавляем выход из системы
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при выходе' });
            return;
        }
        res.json({ success: true });
    });
});

// API для удаления тренера
app.delete('/api/trainers/:id', async (req, res) => {
    const trainerId = req.params.id;
    try {
        // Получаем информацию о тренере, чтобы удалить его изображение
        const trainerResult = await pgPool.query('SELECT image_url FROM trainers WHERE id = $1', [trainerId]);
        const trainer = trainerResult.rows[0];

        if (trainer && trainer.image_url) {
            // Извлекаем public_id из URL Cloudinary
            const publicId = trainer.image_url.split('/').slice(-1)[0].split('.')[0];
            try {
                // Удаляем изображение из Cloudinary
                await cloudinary.uploader.destroy(publicId);
            } catch (error) {
                console.error('Ошибка при удалении изображения из Cloudinary:', error);
                // Продолжаем выполнение, даже если файл не удалось удалить
            }
        }

        // Удаляем тренера из базы данных
        await pgPool.query('DELETE FROM trainers WHERE id = $1', [trainerId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при удалении тренера:', err);
        res.status(500).json({ error: err.message });
    }
});

// API для расписания
app.get('/api/schedule', (req, res) => {
    pgPool.query(`
        SELECT schedule.*, trainers.name as trainer_name 
        FROM schedule 
        LEFT JOIN trainers ON schedule.trainer_id = trainers.id
    `, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(result.rows);
    });
});

// Получение всех отзывов
app.get('/api/reviews', async (req, res) => {
    console.log('Запрос на получение отзывов');
    try {
        const result = await pgPool.query('SELECT * FROM reviews ORDER BY created_at DESC');
        console.log('Отправка отзывов:', result.rows);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Ошибка при получении отзывов:', err);
        res.status(500).json({ error: err.message });
    }
});

// API для получения доступных дней
app.get('/api/schedule/days', (req, res) => {
    pgPool.query('SELECT DISTINCT day FROM schedule ORDER BY day', (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(result.rows.map(row => row.day));
    });
});

// API для получения доступного времени по дню
app.get('/api/schedule/times/:day', (req, res) => {
    // Всегда возвращаем времена с 09:00 до 18:00
    const times = [
        '09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'
    ];
    res.json(times.map(time => ({ time })));
});

// API для проверки доступности времени
app.post('/api/schedule/check-availability', async (req, res) => {
    const { date } = req.body;

    pgPool.query(
        'SELECT schedule_time, COUNT(*) as count FROM applications WHERE schedule_date = $1 GROUP BY schedule_time',
        [date],
        (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Преобразуем результаты в объект, где ключ - время, значение - количество записей
            const availability = {};
            result.rows.forEach(row => {
                availability[row.schedule_time] = row.count;
            });
            
            res.json(availability);
        }
    );
});

// Личный кабинет (profile) — заявки пользователя
app.get('/profile', requireAuth, async (req, res) => {
    const userId = req.session.userId;
    try {
        const userResult = await pgPool.query('SELECT username FROM users WHERE id = $1', [userId]);
        const user = userResult.rows[0];
        if (!user) {
            return res.render('profile', {
                username: 'Пользователь',
                applications: [],
                isAuthenticated: !!req.session.userId,
                isAdmin: !!req.session.isAdmin
            });
        }
        const appsResult = await pgPool.query('SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.render('profile', {
            username: user.username,
            applications: appsResult.rows,
            isAuthenticated: !!req.session.userId,
            isAdmin: !!req.session.isAdmin
        });
    } catch (err) {
        res.render('profile', {
            username: 'Пользователь',
            applications: [],
            isAuthenticated: !!req.session.userId,
            isAdmin: !!req.session.isAdmin
        });
    }
});

app.get('/login', (req, res) => {
    res.render('login', {
        isAuthenticated: !!req.session.userId,
        username: req.session.username || null,
        isAdmin: !!req.session.isAdmin
    });
});

app.get('/register', (req, res) => {
    res.render('register', {
        isAuthenticated: !!req.session.userId,
        username: req.session.username || null,
        isAdmin: !!req.session.isAdmin
    });
});

// API для проверки авторизации
app.get('/api/check-auth', (req, res) => {
    res.json({
        isAuthenticated: !!req.session.userId,
        isAdmin: !!req.session.isAdmin,
        userId: req.session.userId
    });
});

// Добавление нового отзыва
app.post('/api/reviews', async (req, res) => {
    console.log('Получен новый отзыв:', req.body);
    const { name, text } = req.body;
    if (!name || !text) {
        console.log('Отсутствуют обязательные поля');
        return res.status(400).json({ error: 'Необходимо заполнить все поля' });
    }
    try {
        const result = await pgPool.query(
            'INSERT INTO reviews (name, text) VALUES ($1, $2) RETURNING *',
            [name, text]
        );
        const newReview = result.rows[0];
        console.log('Отзыв успешно сохранен:', newReview);
        res.json({ success: true, review: newReview });
    } catch (err) {
        console.error('Ошибка при сохранении отзыва:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/about', (req, res) => {
    res.render('about', {
        isAuthenticated: !!req.session.userId,
        username: req.session.username || null,
        isAdmin: !!req.session.isAdmin
    });
});

app.get('/trainers', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM trainers ORDER BY created_at DESC');
        const trainers = result.rows;
        res.render('trainers', {
            trainers,
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    } catch (err) {
        res.render('trainers', {
            trainers: [],
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    }
});

app.get('/contact', (req, res) => {
    res.render('contact', {
        isAuthenticated: !!req.session.userId,
        username: req.session.username || null,
        isAdmin: !!req.session.isAdmin
    });
});

// Добавляем маршрут для удаления файлов из галереи
app.delete('/api/gallery/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    console.log('Попытка удаления элемента галереи с ID:', id);
    
    // Сначала получаем информацию о файле
    pgPool.query('SELECT url FROM gallery WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Ошибка при получении информации о файле:', err);
            return res.status(500).json({ error: err.message });
        }
        
        const row = result.rows[0];
        if (!row) {
            console.log('Файл не найден в БД');
            return res.status(404).json({ error: 'Файл не найден' });
        }

        console.log('Найден файл для удаления:', row.url);
        
        // Удаляем запись из БД
        pgPool.query('DELETE FROM gallery WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Ошибка при удалении записи из БД:', err);
                return res.status(500).json({ error: err.message });
            }

            // Удаляем файл
            const filePath = path.join(__dirname, row.url.replace(/^\/uploads\//, ''));
            console.log('Путь к файлу для удаления:', filePath);
            
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error('Ошибка при удалении файла:', err);
                    // Продолжаем выполнение, даже если файл не удалось удалить
                }
                console.log('Файл успешно удален');
                res.json({ success: true });
            });
        });
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Добавляем маршрут для удаления заявки
app.delete('/api/applications/:id', async (req, res) => {
    const applicationId = req.params.id;
    try {
        await pgPool.query('DELETE FROM applications WHERE id = $1', [applicationId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при удалении заявки:', err);
        res.status(500).json({ error: err.message });
    }
});

// API для получения списка пользователей
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const result = await pgPool.query('SELECT id, username, is_admin FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении списка пользователей:', error);
        res.status(500).json({ error: 'Ошибка при получении списка пользователей' });
    }
});

// ===== API для управления страницами (CMS) =====
// Получить все страницы
app.get('/api/pages', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM pages ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить одну страницу по slug
app.get('/api/pages/:slug', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Страница не найдена' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать или обновить страницу (upsert)
app.post('/api/pages', requireAdmin, async (req, res) => {
    const { slug, title, content } = req.body;
    if (!slug || !title) {
        return res.status(400).json({ error: 'Необходимо указать slug и title' });
    }
    try {
        const result = await pgPool.query(
            `INSERT INTO pages (slug, title, content, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (slug) DO UPDATE SET
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                updated_at = NOW()
             RETURNING *`,
            [slug, title, content]
        );
        res.json({ success: true, page: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить страницу
app.delete('/api/pages/:slug', requireAdmin, async (req, res) => {
    try {
        await pgPool.query('DELETE FROM pages WHERE slug = $1', [req.params.slug]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Универсальный маршрут для произвольных страниц
app.get('/page/:slug', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM pages WHERE slug = $1', [req.params.slug]);
        if (result.rows.length === 0) {
            return res.status(404).render('404', { message: 'Страница не найдена' });
        }
        const page = result.rows[0];
        res.render('page', {
            title: page.title,
            content: page.content,
            slug: page.slug,
            isAuthenticated: !!req.session.userId,
            username: req.session.username || null,
            isAdmin: !!req.session.isAdmin
        });
    } catch (err) {
        res.status(500).render('500', { message: 'Ошибка сервера' });
    }
});

// ===== API для блоков главной страницы =====
// Получить все блоки главной
app.get('/api/main-blocks', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM blocks WHERE page_slug = $1 ORDER BY position, id', ['main']);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получить один блок
app.get('/api/main-blocks/:id', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM blocks WHERE id = $1 AND page_slug = $2', [req.params.id, 'main']);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Блок не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Создать блок
app.post('/api/main-blocks', requireAdmin, async (req, res) => {
    const { block_type, title, content, position, visible } = req.body;
    try {
        const result = await pgPool.query(
            'INSERT INTO blocks (page_slug, block_type, title, content, position, visible) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            ['main', block_type, title, content, position || 0, visible !== false]
        );
        res.json({ success: true, block: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Обновить блок (теперь поддерживает частичное обновление)
app.put('/api/main-blocks/:id', requireAdmin, async (req, res) => {
    const { block_type, title, content, position, visible } = req.body;
    try {
        // Получаем текущий блок
        const currentResult = await pgPool.query('SELECT * FROM blocks WHERE id = $1 AND page_slug = $2', [req.params.id, 'main']);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Блок не найден' });
        }
        const current = currentResult.rows[0];
        // Обновляем только переданные поля, остальные оставляем как есть
        const newBlockType = typeof block_type !== 'undefined' ? block_type : current.block_type;
        const newTitle = typeof title !== 'undefined' ? title : current.title;
        const newContent = typeof content !== 'undefined' ? content : current.content;
        const newPosition = typeof position !== 'undefined' ? position : current.position;
        const newVisible = typeof visible !== 'undefined' ? visible : current.visible;
        const result = await pgPool.query(
            'UPDATE blocks SET block_type=$1, title=$2, content=$3, position=$4, visible=$5, updated_at=NOW() WHERE id=$6 AND page_slug=$7 RETURNING *',
            [newBlockType, newTitle, newContent, newPosition, newVisible, req.params.id, 'main']
        );
        res.json({ success: true, block: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удалить блок
app.delete('/api/main-blocks/:id', requireAdmin, async (req, res) => {
    try {
        await pgPool.query('DELETE FROM blocks WHERE id = $1 AND page_slug = $2', [req.params.id, 'main']);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Маршрут для загрузки изображения блока главной
app.post('/api/main-blocks/upload-image', upload.single('blockImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }

        // Загрузка на Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'main-blocks'
        });

        // Удаляем локальный файл после загрузки
        fs.unlinkSync(req.file.path);

        // Сохраняем информацию об изображении в БД
        const { block_id, alt } = req.body;
        const dbResult = await pgPool.query(
            'INSERT INTO main_block_images (block_id, url, alt) VALUES ($1, $2, $3) RETURNING id',
            [block_id, result.secure_url, alt]
        );

        res.json({ 
            success: true, 
            id: dbResult.rows[0].id,
            url: result.secure_url 
        });
    } catch (err) {
        console.error('Ошибка при загрузке изображения блока:', err);
        res.status(500).json({ error: err.message });
    }
});

// Маршрут для получения изображений блока
app.get('/api/main-blocks/:blockId/images', async (req, res) => {
    try {
        const { blockId } = req.params;
        const result = await pgPool.query(
            'SELECT * FROM main_block_images WHERE block_id = $1 ORDER BY created_at DESC',
            [blockId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении изображений блока:', err);
        res.status(500).json({ error: err.message });
    }
});

// Маршрут для удаления изображения блока
app.delete('/api/main-blocks/images/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        
        // Получаем информацию об изображении
        const imageResult = await pgPool.query(
            'SELECT url FROM main_block_images WHERE id = $1',
            [imageId]
        );
        
        if (imageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }

        const imageUrl = imageResult.rows[0].url;
        
        // Извлекаем public_id из URL Cloudinary
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        
        try {
            // Удаляем изображение из Cloudinary
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Ошибка при удалении изображения из Cloudinary:', error);
        }

        // Удаляем запись из БД
        await pgPool.query('DELETE FROM main_block_images WHERE id = $1', [imageId]);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при удалении изображения блока:', err);
        res.status(500).json({ error: err.message });
    }
});

// ===== API для блоков обычных страниц (CMS) =====
// Получить все блоки страницы
app.get('/api/page-blocks/:slug', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM blocks WHERE page_slug = $1 ORDER BY position, id', [req.params.slug]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Получить один блок
app.get('/api/page-blocks/block/:id', async (req, res) => {
    try {
        const result = await pgPool.query('SELECT * FROM blocks WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Блок не найден' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Создать или обновить блок
app.post('/api/page-blocks', requireAdmin, async (req, res) => {
    const { id, page_slug, block_type, title, content, position, visible } = req.body;
    try {
        if (id) {
            // Обновление
            const currentResult = await pgPool.query('SELECT * FROM blocks WHERE id = $1', [id]);
            if (currentResult.rows.length === 0) {
                return res.status(404).json({ error: 'Блок не найден' });
            }
            const current = currentResult.rows[0];
            const newBlockType = typeof block_type !== 'undefined' ? block_type : current.block_type;
            const newTitle = typeof title !== 'undefined' ? title : current.title;
            const newContent = typeof content !== 'undefined' ? content : current.content;
            const newPosition = typeof position !== 'undefined' ? position : current.position;
            const newVisible = typeof visible !== 'undefined' ? visible : current.visible;
            const result = await pgPool.query(
                'UPDATE blocks SET block_type=$1, title=$2, content=$3, position=$4, visible=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
                [newBlockType, newTitle, newContent, newPosition, newVisible, id]
            );
            res.json({ success: true, block: result.rows[0] });
        } else {
            // Создание
            const result = await pgPool.query(
                'INSERT INTO blocks (page_slug, block_type, title, content, position, visible) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [page_slug, block_type, title, content, position || 0, visible !== false]
            );
            res.json({ success: true, block: result.rows[0] });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Частичное обновление блока
app.put('/api/page-blocks/block/:id', requireAdmin, async (req, res) => {
    const { block_type, title, content, position, visible } = req.body;
    try {
        const currentResult = await pgPool.query('SELECT * FROM blocks WHERE id = $1', [req.params.id]);
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Блок не найден' });
        }
        const current = currentResult.rows[0];
        const newBlockType = typeof block_type !== 'undefined' ? block_type : current.block_type;
        const newTitle = typeof title !== 'undefined' ? title : current.title;
        const newContent = typeof content !== 'undefined' ? content : current.content;
        const newPosition = typeof position !== 'undefined' ? position : current.position;
        const newVisible = typeof visible !== 'undefined' ? visible : current.visible;
        const result = await pgPool.query(
            'UPDATE blocks SET block_type=$1, title=$2, content=$3, position=$4, visible=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
            [newBlockType, newTitle, newContent, newPosition, newVisible, req.params.id]
        );
        res.json({ success: true, block: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Удалить блок
app.delete('/api/page-blocks/block/:id', requireAdmin, async (req, res) => {
    try {
        await pgPool.query('DELETE FROM blocks WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ===== API для изображений блоков обычных страниц (page-blocks) =====
// Загрузка изображения для блока страницы
app.post('/api/page-blocks/upload-image', upload.single('blockImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        // Загрузка на Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'page-blocks' });
        fs.unlinkSync(req.file.path);
        const { block_id, alt } = req.body;
        const dbResult = await pgPool.query(
            'INSERT INTO page_block_images (block_id, url, alt) VALUES ($1, $2, $3) RETURNING id',
            [block_id, result.secure_url, alt]
        );
        res.json({ success: true, id: dbResult.rows[0].id, url: result.secure_url });
    } catch (err) {
        console.error('Ошибка при загрузке изображения блока страницы:', err);
        res.status(500).json({ error: err.message });
    }
});

// Получить изображения блока страницы
app.get('/api/page-blocks/:blockId/images', async (req, res) => {
    try {
        const { blockId } = req.params;
        const result = await pgPool.query(
            'SELECT * FROM page_block_images WHERE block_id = $1 ORDER BY created_at DESC',
            [blockId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Ошибка при получении изображений блока страницы:', err);
        res.status(500).json({ error: err.message });
    }
});

// Удалить изображение блока страницы
app.delete('/api/page-blocks/images/:imageId', async (req, res) => {
    try {
        const { imageId } = req.params;
        const imageResult = await pgPool.query(
            'SELECT url FROM page_block_images WHERE id = $1',
            [imageId]
        );
        if (imageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Изображение не найдено' });
        }
        const imageUrl = imageResult.rows[0].url;
        const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Ошибка при удалении из Cloudinary:', error);
        }
        await pgPool.query('DELETE FROM page_block_images WHERE id = $1', [imageId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Ошибка при удалении изображения блока страницы:', err);
        res.status(500).json({ error: err.message });
    }
});

// Обработка 404
app.use((req, res) => {
    console.log('404 для пути:', req.path);
    res.status(404).json({ error: 'Страница не найдена' });
});

// Запуск сервера
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

// Добавляем маршрут для получения списка файлов галереи
app.get('/api/gallery', async (req, res) => {
    pgPool.query('SELECT * FROM gallery ORDER BY created_at DESC', [], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(result.rows);
    });
});