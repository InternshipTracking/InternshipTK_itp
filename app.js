var express = require('express');
var cors = require('cors');
var app = express();
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
const mysql = require('mysql2');
var jwt = require('jsonwebtoken');
const secret = 'internship-login';
const nodemailer = require('nodemailer');


app.use(cors({
    origin: '*', // อนุญาตทุกโดเมน
}));

// conn DB 
const conn = mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user: '3WvxbiagZim93GN.root',
    password: 'tIHvSBHY3V5SnAAO',
    database: 'mycompany',
    port: 4000,
    ssl: {
        rejectUnauthorized: true,
    }
});


app.listen(3333, function () {
    console.log('CORS-enabled web server listening on port 3333'); // แจ้งว่าเซิร์ฟเวอร์กำลังทำงาน
});

module.exports = app;

// ฟังก์ชันตรวจสอบผู้ดูแลระบบ
function verifyAdmin(req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Token is required' }); // ถ้าไม่มี token ให้ส่งกลับ error
    }

    jwt.verify(token, secret, function(err, decoded) {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' }); // ถ้า token ไม่ถูกต้องให้ส่งกลับ error
        }

        // ตรวจสอบบทบาท
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' }); // ถ้าไม่ใช่ admin ให้ส่งกลับ error
        }

        next(); // ถ้าผ่านการตรวจสอบให้ไปยังเส้นทางถัดไป
    });
}

// start
app.get('/', (req, res) => {
    res.send('Hello'); 
});


//******* */
//USER//
//******* */

// Register
app.post('/register', jsonParser, function (req, res, next) {
    const validRoles = ['admin', 'user']; // รายการบทบาทที่ถูกต้อง
    if (!validRoles.includes(req.body.role)) {
        return res.status(400).send('Invalid role'); // ถ้าบทบาทไม่ถูกต้องให้ส่งกลับ error
    }

    conn.execute(
        'INSERT INTO account (username, password, role) VALUES (?, ?, ?)',
        [req.body.username, req.body.password, req.body.role],
        function(err, result, fields) {
            if (err) {
                res.status(500).send('Database query failed: ' + err.message); // ถ้า query ไม่สำเร็จให้ส่งกลับ error
                return;
            }
            res.json({status:'INSERT OK :D'}); // ส่งกลับข้อความยืนยันการเพิ่มข้อมูล
        }
    );
});



// Login
app.post('/login', jsonParser, function (req, res, next) {
    conn.execute(
        'SELECT * FROM account WHERE username=?',
        [req.body.username],
        function(err, users, fields) {
            if (err) {
                res.status(500).send('Database query failed: ' + err.message); // ถ้า query ไม่สำเร็จให้ส่งกลับ error
                return;
            }
            if (users.length === 0) {
                res.status(401).send('No User Found'); // ถ้าไม่พบผู้ใช้ให้ส่งกลับ error
                return; 
            }

            const user = users[0];
            if (user.password !== req.body.password) {
                return res.status(401).send('Invalid Password'); // ถ้ารหัสผ่านไม่ถูกต้องให้ส่งกลับ error
            }

            // Generate JWT token with username included
            const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, secret, { expiresIn: '9h' });
            res.json({ 
                token, 
                username: user.username, // ส่งกลับ username ด้วย
                role: user.role 
            });
        }
    );
});

// Authen
app.post('/authen', jsonParser, function (req, res, next) {
    const token = req.headers['authorization'] ? req.headers['authorization'].split(' ')[1] : null;

    if (!token) {
        return res.status(401).json({ error: 'Token is required' }); // ถ้าไม่มี token ให้ส่งกลับ error
    }

    jwt.verify(token, secret, function(err, decoded) {
        if (err) {
            return res.status(401).json({ error: 'Invalid Token' }); // ถ้า token ไม่ถูกต้องให้ส่งกลับ error
        }

        // Token ถูกต้อง
        res.json({ 
            token,
            username: decoded.username, // ส่งกลับ username
            role: decoded.role // ส่งกลับ role
        });
    });
});

// เพิ่มข้อมูลส่วนตัว user
app.post('/add-user-info', jsonParser, function (req, res, next) {
    const { nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date, user_id } = req.body;

    conn.execute(
        'INSERT INTO users (nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date, user_id],
        function(err, result) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            res.json({status:'User information added successfully'});
        }
    );
});

// เพิ่มข้อมูลส่วนตัว admin
app.post('/add-admin-info', jsonParser, function (req, res, next) {
    const { nickname, full_name, email, admin_id, phone_number } = req.body;

    conn.execute(
        'INSERT INTO admins (nickname, full_name, email, admin_id, phone_number) VALUES (?, ?, ?, ?, ?)',
        [nickname, full_name, email, admin_id, phone_number],
        function(err, result) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            res.json({status:'Admin information added successfully'});
        }
    );
});



// admin get info
app.get('/admin-info/:id', function (req, res) {
    const adminId = req.params.id;

    // ตรวจสอบว่า adminId มีค่า
    if (!adminId) {
        return res.status(400).send('Admin ID is required');
    }

    conn.execute(
        'SELECT nickname, full_name, email, phone_number FROM admins WHERE admin_id = ?',
        [adminId],
        function(err, results) {
            if (err) {
                console.error('Database query failed:', err); // แสดงข้อผิดพลาดในคอนโซล
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results[0]); // ส่งข้อมูล admin กลับไป
            } else {
                res.status(404).send('Admin not found');
            }
        }
    );
});



// admin get all
app.get('/admin-info', function (req, res) {
    conn.execute(
        'SELECT nickname, full_name, email, phone_number FROM admins',
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results); // ส่งข้อมูล admin ทั้งหมดกลับไป
            } else {
                res.status(404).send('No admins found');
            }
        }
    );
});

// user get all
app.get('/user-info', function (req, res) {
    conn.execute(
        'SELECT nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date FROM users',
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results); 
            } else {
                res.status(404).send('No admins found');
            }
        }
    );
});

//user get info
app.get('/user-info/:id', function (req, res) {
    const userId = req.params.id;

    conn.execute(
        'SELECT nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date FROM users WHERE user_id = ?',
        [userId],
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results[0]); // ส่งข้อมูล user กลับไป
            } else {
                res.status(404).send('User not found');
            }
        }
    );
});

// อัปเดตข้อมูลผู้ใช้
app.put('/update-user-info/:id', jsonParser, function (req, res) {
    const userId = req.params.id;
    const { nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date } = req.body;

    const sql = `
        UPDATE users 
        SET nickname = ?, full_name = ?, email = ?, phone_number = ?, 
            university = ?, faculty = ?, major = ?, student_id = ?, 
            internship_end_date = ? 
        WHERE user_id = ?
    `;

    const values = [nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date, userId];

    conn.execute(sql, values, function(err, result) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('User not found'); // หากไม่พบผู้ใช้
        }
        res.json({ status: 'User information updated successfully' });
    });
});

// อัปเดตข้อมูลผู้ดูแลระบบ
app.put('/update-admin-info/:id', jsonParser, function (req, res) {
    const adminId = req.params.id;
    const { nickname, full_name, email, phone_number } = req.body;

    const sql = `
        UPDATE admins 
        SET nickname = ?, full_name = ?, email = ?, phone_number = ?
        WHERE admin_id = ?
    `;

    const values = [nickname, full_name, email, phone_number, adminId];

    conn.execute(sql, values, function(err, result) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('Admin not found'); // หากไม่พบผู้ดูแลระบบ
        }
        res.json({ status: 'Admin information updated successfully' });
    });
});


// อัปเดตข้อมูลผู้ใช้
app.put('/update-user-info/:id', jsonParser, function (req, res) {
    const userId = req.params.id;
    const { nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date } = req.body;

    const sql = `
        UPDATE users 
        SET 
            nickname = ?, 
            full_name = ?, 
            email = ?, 
            phone_number = ?, 
            university = ?, 
            faculty = ?, 
            major = ?, 
            student_id = ?, 
            internship_end_date = ?
        WHERE id = ?
    `;

    const values = [nickname, full_name, email, phone_number, university, faculty, major, student_id, internship_end_date, userId];

    conn.execute(sql, values, function(err, result) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        if (result.affectedRows === 0) {
            return res.status(404).send('User not found'); 
        }
        res.json({ status: 'User information updated successfully' });
    });
});

// account-get-all
app.get('/accounts-all', (req, res) => {
    const sql = 'SELECT * FROM account';
    conn.query(sql, (err, result) => {
        if (err) {
            console.error('Database query error:', err); 
            res.status(500).send({ error: 'Error fetching accounts' });
        } else {
            res.send(result);
        }
    });
});

// account-username
app.get('/accounts/:username', (req, res) => {
    const username = req.params.username;
    const sql = 'SELECT id, username FROM account WHERE username = ?';
    conn.query(sql, [username], (err, result) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).send({ error: 'Error fetching accounts' });
        } else if (result.length > 0) {
            res.status(200).send({ exists: true, id: result[0].id }); 
        } else {
            res.status(200).send({ exists: false });
        }
    });
});



// account-delete
app.delete('/delete-account/:id', (req, res) => {
    const accountId = req.params.id;

    // SQL ลบจากตาราง account, admins, users
    const sqlDeleteAccount = 'DELETE FROM account WHERE id = ?';
    const sqlDeleteAdmins = 'DELETE FROM admins WHERE admin_id = ?';
    const sqlDeleteUsers = 'DELETE FROM users WHERE user_id = ?';

    // ลบจากตาราง admins และ users ก่อน
    conn.query(sqlDeleteAdmins, [accountId], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Error deleting from admins' });
        }

        conn.query(sqlDeleteUsers, [accountId], (err, result) => {
            if (err) {
                return res.status(500).send({ error: 'Error deleting from users' });
            }

            // ลบจากตาราง account
            conn.query(sqlDeleteAccount, [accountId], (err, result) => {
                if (err) {
                    return res.status(500).send({ error: 'Error deleting account' });
                }
                res.send({ message: 'Account and related data deleted successfully' });
            });
        });
    });
});

// delete-all-tasks
app.delete('/delete-all-tasks', (req, res) => {
    // SQL ลบจากตาราง tasks
    const sqlDeleteTasks = 'DELETE FROM tasks';

    conn.query(sqlDeleteTasks, (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Error deleting tasks' });
        }
        res.send({ message: 'All tasks deleted successfully' });
    });
});

// account-update
app.put('/update-account/:id', (req, res) => {
    const accountId = req.params.id;
    const { username, password } = req.body;

    console.log("Updating account:", accountId, username, password); 

    const sqlUpdateAccount = 'UPDATE account SET username = ?, password = ? WHERE id = ?';

    conn.query(sqlUpdateAccount, [username, password, accountId], (err, result) => {
        if (err) {
            console.error("Error updating account:", err); 
            return res.status(500).send({ error: 'Error updating account' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Account not found' });
        }

        res.send({ message: 'Account updated successfully' });
    });
});

// ดึงข้อมูล nickname ตาม user_ID
app.get('/get-Userid/:user_id', function (req, res) {
    const userId = req.params.user_id; // ดึง user_id จากพารามิเตอร์

    conn.execute(
        'SELECT nickname FROM users WHERE user_id = ?',
        [userId],
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json({ nickname: results[0].nickname }); // ส่ง nickname กลับไป
            } else {
                res.status(404).send('ไม่พบผู้ใช้ที่มี user_id: ' + userId);
            }
        }
    );
});


//******* */
//TASK//
//******* */

app.post('/add-task', jsonParser, function (req, res, next) {
    const { website_name, demo, username, password, internship, status, staff, linkpool } = req.body;

    const start_date = new Date(); // วันที่ปัจจุบัน
    const formattedStartDate = start_date.toLocaleDateString('en-CA'); // รูปแบบ YYYY-MM-DD

    // ค้นหาข้อมูล user (nickname และ email) ตาม internship
    conn.execute(
        'SELECT nickname, email FROM users WHERE nickname = ?',
        [internship],
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }

            if (results.length === 0) {
                return res.status(404).send('Internship nickname not found');
            }

            const nickname = results[0].nickname;
            const email = results[0].email;

            // เพิ่มข้อมูลงานลงในตาราง tasks
            conn.execute(
                'INSERT INTO tasks (website_name, demo, username, password, internship, status, staff, start_date, linkpool) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [website_name, demo, username, password, nickname, status, staff, formattedStartDate, linkpool],
                function(err, result) {
                    if (err) {
                        return res.status(500).send('Database query failed: ' + err.message);
                    }

                    // ตั้งค่า transporter สำหรับส่งอีเมล
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        auth: {
                            user: 'vasupol.itopplus@gmail.com', // อีเมลของคุณ
                            pass: 'zkrj xmkd bkcb irjf' // รหัสผ่านอีเมลของคุณ
                        }
                    });

                    // เนื้อหาและรายละเอียดของอีเมล
                    const mailOptions = {
                        from: 'vasupol.itopplus@gmail.com',
                        to: email, // ส่งไปที่อีเมลของ user
                        subject: 'คุณได้รับงานใหม่',
                        text: `สวัสดี ${nickname}, คุณได้รับงานใหม่ในระบบ : Internship Tracking
                        Website Name : ${website_name}`
                    };

                    // ส่งอีเมล
                    transporter.sendMail(mailOptions, function(error, info){
                        if (error) {
                            return res.status(500).send('Failed to send email: ' + error.message);
                        }
                        res.json({ status: 'Task added and email sent successfully' });
                    });
                }
            );
        }
    );
});

app.put('/update-task/:id', jsonParser, function(req, res) {
    const taskId = req.params.id;
    const { complete, website_name, demo, username, password, internship, status, staff, linkpool } = req.body;

    // อัปเดตข้อมูลงานในตาราง tasks
    conn.execute(
        'UPDATE tasks SET complete = ?, website_name = ?, demo = ?, username = ?, password = ?, internship = ?, status = ?, staff = ?, linkpool = ? WHERE id = ?',
        [complete, website_name, demo, username, password, internship, status, staff, linkpool, taskId],
        function(err, result) {
            if (err) {
                return res.status(500).send('Database update failed: ' + err.message);
            }

            // ส่งผลลัพธ์กลับไปยังผู้ใช้
            res.json({ status: 'Task updated successfully' });
        }
    );
});



// API เพื่อดึงข้อมูลชื่อเล่น (nickname) ของ users
app.get('/get-users-nickname', function (req, res) {
    conn.execute('SELECT nickname FROM users', function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        res.json(results); // ส่งผลลัพธ์ชื่อเล่นของ users กลับในรูป JSON
    });
});


// API เพื่อดึงข้อมูลชื่อเล่น (nickname) ของ admins
app.get('/get-admins-nickname', function (req, res) {
    conn.execute('SELECT nickname FROM admins', function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        res.json(results); // ส่งผลลัพธ์ชื่อเล่นของ admins กลับในรูป JSON
    });
});

// ดึงข้อมูลงานจากชื่อแต่ละเดือน
app.get('/get-nicknames-with-count-by-month', function (req, res) {
    conn.execute(
        `SELECT MONTH(start_date) AS month, internship, COUNT(*) AS task_count
         FROM tasks
         GROUP BY MONTH(start_date), internship`,
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            res.json(results); // ส่งข้อมูลทั้งหมดกลับไป
        }
    );
});



// ดึงข้อมูลงานทั้งหมด
app.get('/get-tasks', function (req, res) {
    conn.execute(
        'SELECT * FROM tasks',
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            res.json(results); // ส่งข้อมูลทั้งหมดกลับไป
        }
    );
});

// ดึงข้อมูลงานทั้งหมดพร้อมรวมเดือน
app.get('/get-tasks-m', function (req, res) {
    const sql = `
        SELECT 
            website_name, 
            internship, 
            MONTH(start_date) AS month, 
            COUNT(*) AS task_count 
        FROM tasks 
        WHERE start_date IS NOT NULL 
        GROUP BY website_name, internship, month
    `;

    conn.execute(sql, function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        res.json(results); // ส่งข้อมูลที่รวมเดือนกลับไป
    });
});

// ดึงข้อมูลงานตาม ID
app.get('/get-taskbyID/:id', function (req, res) {
    const taskId = req.params.id; // ดึง ID ของงานจากพารามิเตอร์

    conn.execute(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId],
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results[0]); // ส่งข้อมูลงานกลับไป
            } else {
                res.status(404).send('ไม่พบงานที่มี ID: ' + taskId);
            }
        }
    );
});





// ดึงข้อมูลงานตามชื่อเล่น
app.get('/get-task/:nickname', function (req, res) {
    const nickname = req.params.nickname;

    conn.execute(
        'SELECT tasks.* FROM tasks JOIN users ON tasks.internship = users.nickname WHERE users.nickname = ?',
        [nickname],
        function(err, results) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (results.length > 0) {
                res.json(results); // ส่งข้อมูลงานกลับไป
            } else {
                res.status(404).send('ไม่พบชื่อ: ' + nickname);
            }
        }
    );
});




// API เพื่อดึงข้อมูลชื่อเล่น (nickname) ของ users โดยใช้ id
app.get('/get-users-nickname', function (req, res) {
    const userId = req.query.id; // ดึง id จาก query string
    if (!userId) {
        return res.status(400).send('Missing user ID'); // ตรวจสอบว่า id มีอยู่หรือไม่
    }

    // เปลี่ยน SQL เพื่อดึง nickname ตาม id
    conn.execute('SELECT nickname FROM users WHERE id = ?', [userId], function (err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }

        if (results.length === 0) {
            return res.status(404).send('User not found'); // หากไม่พบผู้ใช้
        }

        res.json({ nickname: results[0].nickname }); // ส่ง nickname กลับในรูป JSON
    });
});

// ลบข้อมูลงาน
app.delete('/delete-task/:id', function (req, res) {
    const taskId = req.params.id;

    conn.execute(
        'DELETE FROM tasks WHERE id = ?',
        [taskId],
        function(err, result) {
            if (err) {
                return res.status(500).send('Database query failed: ' + err.message);
            }
            if (result.affectedRows === 0) {
                return res.status(404).send('Task not found'); // หากไม่พบงาน
            }
            res.json({ status: 'Task deleted successfully' });
        }
    );
});

// ดึงข้อมูลงานตามชื่อเล่นและเดือน
app.get('/get-task-m/:nickname', function (req, res) {
    const nickname = req.params.nickname;
    const month = req.query.month; // ดึงเดือนจากพารามิเตอร์

    // กำหนด SQL Query
    let sql = 'SELECT tasks.* FROM tasks JOIN users ON tasks.internship = users.nickname WHERE users.nickname = ?';
    const queryParams = [nickname];

    // ถ้ามีการระบุเดือนให้เพิ่มเงื่อนไข
    if (month) {
        sql += ' AND MONTH(start_date) = ?';
        queryParams.push(month); // เพิ่มเดือนเข้าไปในพารามิเตอร์
    }

    conn.execute(sql, queryParams, function(err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        if (results.length > 0) {
            res.json(results); // ส่งข้อมูลงานกลับไป
        } else {
            res.json([]); // ส่งอาร์เรย์ว่างเมื่อไม่พบงาน
        }
    });
});


app.get('/get-task-all/:nickname', function (req, res) {
    const nickname = req.params.nickname;

    // กำหนด SQL Query เพื่อดึงงานทั้งหมดตาม nickname
    const sql = 'SELECT tasks.* FROM tasks JOIN users ON tasks.internship = users.nickname WHERE users.nickname = ?';
    
    conn.execute(sql, [nickname], function(err, results) {
        if (err) {
            return res.status(500).send('Database query failed: ' + err.message);
        }
        if (results.length > 0) {
            res.json(results); // ส่งข้อมูลงานทั้งหมดกลับไป
        } else {
            res.status(404).send('ไม่พบชื่อ: ' + nickname);
        }
    });
});


//*********** */
//announcement//
//*********** */


// เพิ่มประกาศ
app.post('/add-announcement', (req, res) => {
    const { message } = req.body;

    // ตรวจสอบให้แน่ใจว่ามีข้อความ
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    conn.query('INSERT INTO announcements (message) VALUES (?)', [message], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({ id: result.insertId });
    });
});

// ดึงประกาศทั้งหมด
app.get('/announcements', (req, res) => {
    conn.query('SELECT * FROM announcements ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

// เพิ่มคอมเมนต์
app.post('/add-comment', (req, res) => {
    const { announcement_id, comment } = req.body;

    // ตรวจสอบให้แน่ใจว่ามี announcement_id และ comment
    if (!announcement_id || !comment) {
        return res.status(400).json({ error: "Announcement ID and comment are required" });
    }

    conn.query('INSERT INTO comments (announcement_id, comment) VALUES (?, ?)', [announcement_id, comment], (err, result) => {
        if (err) return res.status(500).send(err);
        res.status(201).send({ id: result.insertId });
    });
});

// ดึงคอมเมนต์สำหรับประกาศที่ระบุ
app.get('/comments/:announcementId', (req, res) => {
    const { announcementId } = req.params;
    conn.query('SELECT * FROM comments WHERE announcement_id = ?', [announcementId], (err, results) => {
        if (err) return res.status(500).send(err);
        res.send(results);
    });
});

// ลบประกาศ
app.delete('/announcements/:id', (req, res) => {
    const { id } = req.params;
    conn.query('DELETE FROM announcements WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(204); // No Content
    });
});

// แก้ไขประกาศ
app.put('/announcements/:id', (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    // ตรวจสอบให้แน่ใจว่ามีข้อความ
    if (!message) {
        return res.status(400).json({ error: "Message is required" });
    }

    conn.query('UPDATE announcements SET message = ? WHERE id = ?', [message, id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(204); // No Content
    });
});

// ลบคอมเมนต์
app.delete('/comments/:id', (req, res) => {
    const { id } = req.params;
    conn.query('DELETE FROM comments WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(204); // No Content
    });
});

// แก้ไขคอมเมนต์
app.put('/comments/:id', (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    // ตรวจสอบให้แน่ใจว่ามีคอมเมนต์
    if (!comment) {
        return res.status(400).json({ error: "Comment is required" });
    }

    conn.query('UPDATE comments SET comment = ? WHERE id = ?', [comment, id], (err, result) => {
        if (err) return res.status(500).send(err);
        res.sendStatus(204); // No Content
    });
});


