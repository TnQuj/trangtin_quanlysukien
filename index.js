const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const cheerio = require('cheerio');

// Các model và router
const Event = require('./models/Event');
const authRouter = require('./routers/auth');
const DangKy = require('./models/DangKy');
const TaiKhoan = require('./models/TaiKhoan');
const app = express();

// Cấu hình
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: 'meomeomeo123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }
}));

// Kết nối MongoDB
const uri = 'mongodb://admin:mongo123456@ac-yayng3t-shard-00-02.dhdb8ff.mongodb.net:27017/quanlysukien?ssl=true&authSource=admin';
mongoose.connect(uri)
    .then(() => console.log('Kết nối MongoDB Atlas thành công'))
    .catch(err => console.error('Lỗi kết nối:', err));


// Middleware truyền dữ liệu cho mọi trang
app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.hoVaTen = req.session.hoVaTen || null;
    res.locals.role = req.session.role || null;
    res.locals.success = req.session.success || null;
    res.locals.error = req.session.error || null;

    delete req.session.success;
    delete req.session.error;
    next();
});

// ====================== NGƯỜI GÁC CỔNG (PHẢI ĐẶT Ở ĐÂY) ======================
const checkLogin = (req, res, next) => {
    if (!req.session.loggedIn) {
        req.session.error = 'Bạn phải đăng nhập để thực hiện chức năng này!';
        return res.redirect('/dangnhap');
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (!req.session.loggedIn || req.session.role !== 'admin') {
        req.session.error = 'Bạn không có quyền truy cập trang này!';
        return res.redirect('/sukien');
    }
    next();
};
// ==============================================================================

// Sử dụng router auth
app.use('/', authRouter);

// ====================== DANH SÁCH SỰ KIỆN (ĐÃ KHÓA) ======================
// ====================== DANH SÁCH SỰ KIỆN ======================
app.get('/sukien', checkLogin, async (req, res) => {
    const keyword = req.query.keyword || '';
    const msg = req.query.msg || '';

    let events = await Event.find().sort({ ngay: -1 });

    if (keyword) {
        events = await Event.find({
            tenSuKien: { $regex: keyword, $options: 'i' }
        }).sort({ ngay: -1 });
    }

    const DangKy = require('./models/DangKy');
    for (let e of events) {
        e.soLuongDaDangKy = await DangKy.countDocuments({ suKien: e._id });
    }

    if (req.session.role === 'admin') {
        // Giao diện Bảng quản lý
        res.render('admin_events', { events, msg, keyword });
    } else {
        // Nếu là Sinh viên
        res.render('events', { events, msg, keyword });
    }
});

// ====================== API QUÉT SỰ KIỆN AGU ======================
app.get('/api/quet-su-kien-agu', checkLogin, async (req, res) => {
    try {
        const response = await axios.get('https://sao.agu.edu.vn/event/danh-sach-su-kien');
        const html = response.data;
        const $ = cheerio.load(html);
        let ketQuaScrape = [];

        $('.event-item, .card, .item').each((index, element) => {
            let tenSuKien = $(element).find('h3, h4, .title, .event-name').text().trim();
            let diaDiem = $(element).find('.location, .place, i.fa-map-marker').parent().text().trim();
            let moTa = $(element).find('.description, .summary, p').text().trim();

            if (tenSuKien) {
                ketQuaScrape.push({
                    tenSuKien,
                    diaDiem: diaDiem || 'Đại học An Giang',
                    moTa
                });
            }
        });

        res.json({ success: true, data: ketQuaScrape });
    } catch (error) {
        console.error("Lỗi khi quét AGU:", error);
        res.status(500).json({ success: false, message: 'Không thể kết nối đến trang web AGU.' });
    }
});

// ====================== QUẢN LÝ SỰ KIỆN ======================
app.get('/them', checkLogin, (req, res) => res.render('them'));

app.post('/them', checkLogin, async (req, res) => {
    // Nhận thêm hinhAnh
    const { tenSuKien, ngay, diaDiem, moTa, soLuongToiDa, hinhAnh } = req.body;

    await new Event({
        tenSuKien, ngay, diaDiem, moTa, hinhAnh, // Lưu vào DB
        soLuongToiDa: parseInt(soLuongToiDa) || 100
    }).save();

    res.redirect('/sukien?msg=them');
});

app.post('/xoa/:id', checkLogin, async (req, res) => {
    await Event.findByIdAndDelete(req.params.id);
    res.redirect('/sukien?msg=xoa');
});

app.get('/sua/:id', checkLogin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.redirect('/sukien');
    res.render('sua', { event });
});

app.post('/sua/:id', checkLogin, async (req, res) => {
    // Thêm biến hinhAnh vào danh sách nhận từ form
    const { tenSuKien, ngay, diaDiem, moTa, hinhAnh } = req.body;

    // Cập nhật thêm hinhAnh vào Database
    await Event.findByIdAndUpdate(req.params.id, {
        tenSuKien, ngay, diaDiem, moTa, hinhAnh
    });

    res.redirect('/sukien?msg=sua');
});

// ====================== TRANG QUẢN LÝ TÀI KHOẢN (CHỈ ADMIN) ======================
app.get('/admin/taikhoan', checkLogin, isAdmin, async (req, res) => {
    const TaiKhoan = require('./models/TaiKhoan');
    const users = await TaiKhoan.find().sort({ ngayTao: -1 });

    res.render('admin_taikhoan', {
        users, success: req.session.success, error: req.session.error
    });

    delete req.session.success;
    delete req.session.error;
});

app.post('/admin/suarole/:id', checkLogin, isAdmin, async (req, res) => {
    const TaiKhoan = require('./models/TaiKhoan');
    const { role } = req.body;

    const user = await TaiKhoan.findById(req.params.id);
    if (user && (role === 'admin' || role === 'user')) {
        user.role = role;
        await user.save();
    }
    res.redirect('/admin/taikhoan');
});

app.post('/admin/khoataikhoan/:id', checkLogin, isAdmin, async (req, res) => {
    const TaiKhoan = require('./models/TaiKhoan');
    const user = await TaiKhoan.findById(req.params.id);

    if (user) {
        user.khoa = !user.khoa;
        await user.save();

        req.session.success = user.khoa
            ? `Đã khóa tài khoản ${user.tenDangNhap}`
            : `Đã mở tài khoản ${user.tenDangNhap}`;
    }
    res.redirect('/admin/taikhoan');
});

// ====================== ADMIN - DANH SÁCH ĐĂNG KÝ ======================
app.get('/admin/danhsachdangky', checkLogin, isAdmin, async (req, res) => {
    const DangKy = require('./models/DangKy');
    const allDangKy = await DangKy.find().populate('suKien').populate('taiKhoan', 'hoVaTen tenDangNhap email');

    const groupByEvent = {};
    allDangKy.forEach(dk => {
        if (!dk.suKien) return;
        const key = dk.suKien._id.toString();
        if (!groupByEvent[key]) {
            groupByEvent[key] = { suKien: dk.suKien, soLuong: 0, danhSach: [] };
        }
        groupByEvent[key].soLuong++;
        groupByEvent[key].danhSach.push(dk);
    });

    const danhSachSuKien = Object.values(groupByEvent);
    res.render('admin_danhsachdangky', { danhSachSuKien });
});

app.get('/admin/sukien_dangky/:id', checkLogin, isAdmin, async (req, res) => {
    const DangKy = require('./models/DangKy');
    const Event = require('./models/Event');

    const suKien = await Event.findById(req.params.id);
    if (!suKien) return res.redirect('/admin/danhsachdangky');

    const danhSachDangKy = await DangKy.find({ suKien: req.params.id })
        .populate('taiKhoan', 'hoVaTen tenDangNhap email')
        .sort({ ngayDangKy: -1 });

    res.render('admin_sukien_dangky', { suKien, danhSachDangKy });
});

// ====================== XEM CHI TIẾT SỰ KIỆN (ĐÃ KHÓA) ======================
app.get('/sukien/:id', checkLogin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.redirect('/sukien');

    const DangKy = require('./models/DangKy');
    const soLuongDaDangKy = await DangKy.countDocuments({ suKien: event._id });

    res.render('sukien_chitiet', {
        event, soLuongDaDangKy, loggedIn: req.session.loggedIn || false
    });
});

// ====================== ĐĂNG KÝ / HỦY ĐĂNG KÝ ======================
app.post('/dangky_sukien/:id', checkLogin, async (req, res) => {
    try {
        const DangKy = require('./models/DangKy');
        const suKienId = req.params.id;
        const userId = req.session.userId;

        const daDangKy = await DangKy.findOne({ suKien: suKienId, taiKhoan: userId });
        if (daDangKy) {
            req.session.error = 'Bạn đã đăng ký sự kiện này rồi!';
            return res.redirect('/sukien');
        }

        const event = await Event.findById(suKienId);
        if (!event) {
            req.session.error = 'Sự kiện không tồn tại!';
            return res.redirect('/sukien');
        }

        const soLuongDaDangKy = await DangKy.countDocuments({ suKien: suKienId });
        if (event.soLuongToiDa && soLuongDaDangKy >= event.soLuongToiDa) {
            req.session.error = 'Sự kiện đã đủ số lượng đăng ký!';
            return res.redirect('/sukien');
        }

        await new DangKy({ suKien: suKienId, taiKhoan: userId, ngayDangKy: new Date() }).save();

        req.session.success = 'Đăng ký sự kiện thành công!';
        res.redirect('/sukien');
    } catch (err) {
        console.error('Lỗi:', err);
        req.session.error = 'Có lỗi xảy ra!';
        res.redirect('/sukien');
    }
});

app.get('/sukien_dadangky', checkLogin, async (req, res) => {
    const DangKy = require('./models/DangKy');
    const danhSachDaDangKy = await DangKy.find({ taiKhoan: req.session.userId })
        .populate('suKien').sort({ ngayDangKy: -1 });

    res.render('sukien_dadangky', { danhSach: danhSachDaDangKy });
});

app.post('/huy_dangky/:id', checkLogin, async (req, res) => {
    try {
        const DangKy = require('./models/DangKy');
        await DangKy.findByIdAndDelete(req.params.id);
        req.session.success = 'Đã hủy đăng ký thành công!';
        res.redirect('/sukien_dadangky');
    } catch (err) {
        req.session.error = 'Có lỗi xảy ra!';
        res.redirect('/sukien_dadangky');
    }
});

// ====================== ĐỔI MẬT KHẨU ======================
app.get('/doimatkhau', checkLogin, (req, res) => res.render('doimatkhau'));

app.post('/doimatkhau', checkLogin, async (req, res) => {
    const { matKhauCu, matKhauMoi, xacNhanMatKhau } = req.body;
    const TaiKhoan = require('./models/TaiKhoan');
    const user = await TaiKhoan.findById(req.session.userId);

    if (!bcrypt.compareSync(matKhauCu, user.matKhau)) {
        req.session.error = 'Mật khẩu cũ không đúng!';
        return res.redirect('/doimatkhau');
    }
    if (matKhauMoi !== xacNhanMatKhau) {
        req.session.error = 'Mật khẩu mới và xác nhận không khớp!';
        return res.redirect('/doimatkhau');
    }

    const salt = bcrypt.genSaltSync(10);
    user.matKhau = bcrypt.hashSync(matKhauMoi, salt);
    await user.save();

    req.session.success = 'Đổi mật khẩu thành công!';
    res.redirect('/doimatkhau');
});

// ====================== TRANG CHỦ (DASHBOARD) ======================
app.get('/', checkLogin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Thống kê Sự kiện (Dùng model Event)
        const suKienSapToi = await Event.countDocuments({ ngay: { $gte: today } });
        const tongSuKien = await Event.countDocuments();
        const suKienDaKetThuc = tongSuKien - suKienSapToi;

        // 2. Thống kê Tài khoản & Đăng ký (Dùng model TaiKhoan và DangKy)
        // Đảm bảo bạn đã require các model này ở đầu file hoặc ngay tại đây
        const TaiKhoan = require('./models/TaiKhoan');
        const DangKy = require('./models/DangKy');

        const tongTaiKhoan = await TaiKhoan.countDocuments();
        const tongDangKy = await DangKy.countDocuments(); // <-- ĐÂY LÀ BIẾN ĐANG THIẾU

        // 3. Gửi dữ liệu ra giao diện (Đảm bảo tên biến khớp với file .ejs)
        res.render('index', {
            suKienSapToi,
            suKienDaKetThuc,
            tongSuKien,
            tongTaiKhoan,
            tongDangKy, // Gửi biến này sang index.ejs
            loggedIn: req.session.loggedIn || false,
            hoVaTen: req.session.hoVaTen || '',
            role: req.session.role || null
        });

    } catch (error) {
        console.error("Lỗi trang chủ:", error);
        res.status(500).send("Có lỗi xảy ra khi tải dữ liệu thống kê.");
    }
});

const DiaDiem = require('./models/DiaDiem');

app.get('/bando', async (req, res) => {
    try {
        // Lấy tất cả địa điểm từ collection diadiem
        const data = await DiaDiem.find({});

        res.render('bando', {
            locations: data,
            // ... các biến khác như loggedIn, role ...
        });
    } catch (err) {
        console.error("Lỗi lấy dữ liệu địa điểm:", err);
        res.status(500).send("Lỗi Server");
    }
});

const TinTuc = require('./models/TinTuc');


app.get('/tintuc', async (req, res) => {
    try {
        const dsTinTuc = await TinTuc.find().sort({ ngayDang: -1 });

        // Vì file nằm ở views/tintuc.ejs, ta chỉ cần gọi 'tintuc'
        res.render('tintuc', {
            dsTinTuc: dsTinTuc,
            loggedIn: req.session.loggedIn || false,
            role: req.session.role || 'user',
            currentPage: 'tintuc' // Biến này để sidebar nhận biết trang hiện tại
        });
    } catch (err) {
        console.error("Lỗi khi tải trang tin tức:", err);
        res.redirect('/');
    }
});

// 1. Route để hiển thị trang sửa bài viết
app.get('/admin/tintuc/sua/:id', async (req, res) => {
    try {
        // Kiểm tra quyền admin
        if (req.session.role !== 'admin') return res.redirect('/tintuc');

        const tin = await TinTuc.findById(req.params.id);
        if (!tin) return res.redirect('/tintuc');

        res.render('admin_sua_tintuc', {
            tin,
            loggedIn: req.session.loggedIn,
            role: req.session.role
        });
    } catch (err) {
        res.redirect('/tintuc');
    }
});

// 2. Route để xử lý cập nhật dữ liệu vào MongoDB
app.post('/admin/tintuc/sua/:id', async (req, res) => {
    try {
        const { tieuDe, danhMuc, hinhAnh, tomTat, noiDung } = req.body;

        await TinTuc.findByIdAndUpdate(req.params.id, {
            tieuDe, danhMuc, hinhAnh, tomTat, noiDung
        });

        res.redirect('/tintuc'); // Sửa xong quay về danh sách
    } catch (err) {
        console.error(err);
        res.send("Lỗi khi cập nhật bài viết");
    }
});
// ====================== KHỞI ĐỘNG SERVER ======================
app.listen(3000, () => {
    console.log('Server chạy tại http://localhost:3000');
});