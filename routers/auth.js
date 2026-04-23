const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const TaiKhoan = require('../models/TaiKhoan');

// ==========================================
// 1. GIAO DIỆN: HIỂN THỊ TRANG ĐĂNG NHẬP
// ==========================================
router.get('/dangnhap', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }

    res.render('dangnhap', {
        error: req.session.error,
        success: req.session.success
    });

    delete req.session.error;
    delete req.session.success;
});


// ==========================================
// 2. LOGIC: XỬ LÝ DỮ LIỆU KHI BẤM NÚT "ĐĂNG NHẬP"
// ==========================================
router.post('/dangnhap', async (req, res) => {
    try {
        const { tenDangNhap, matKhau } = req.body;

        const user = await TaiKhoan.findOne({ tenDangNhap });

        if (!user) {
            req.session.error = 'Tên đăng nhập hoặc mật khẩu chưa chính xác';
            return res.redirect('/dangnhap');
        }

        if (user.khoa === true) {
            req.session.error = 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin!';
            return res.redirect('/dangnhap');
        }

        if (bcrypt.compareSync(matKhau, user.matKhau)) {

            // ✅ ĐĂNG NHẬP THÀNH CÔNG -> Lưu thông tin vào phiên (Session)
            req.session.loggedIn = true;
            req.session.hoVaTen = user.hoVaTen;
            req.session.userId = user._id;
            req.session.role = user.role;

            // --- ĐIỀU HƯỚNG THÔNG MINH THEO PHÂN QUYỀN ---
            if (user.role === 'admin') {
                return res.redirect('/');
            } else {
                return res.redirect('/sukien');
            }
        }


        req.session.error = 'Tên đăng nhập hoặc mật khẩu chưa chính xác';
        res.redirect('/dangnhap');

    } catch (error) {
        console.error("Lỗi quá trình đăng nhập: ", error);
        req.session.error = 'Đã xảy ra lỗi máy chủ, vui lòng thử lại sau!';
        res.redirect('/dangnhap');
    }
});

// ==========================================
// 3. LOGIC: XỬ LÝ ĐĂNG XUẤT
// ==========================================
router.get('/dangxuat', (req, res) => {
    // Xóa toàn bộ dữ liệu phiên làm việc
    req.session.destroy((err) => {
        if (err) {
            console.error("Lỗi khi đăng xuất: ", err);
        }
        res.redirect('/dangnhap');
    });
});

// ==========================================
// 4. GIAO DIỆN: HIỂN THỊ TRANG ĐĂNG KÝ
// ==========================================
// Hiển thị trang đăng ký khi người dùng gõ /dangky trên thanh địa chỉ
router.get('/dangky', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    res.render('dangky', { error: req.session.error || null });

    delete req.session.error;
});

router.post('/dangky', async (req, res) => {
    try {
        console.log("Dữ liệu nhận được:", req.body); // Bước 1: Kiểm tra dữ liệu vào

        const { hoVaTen, email, tenDangNhap, matKhau, xacNhanMatKhau } = req.body;

        if (matKhau !== xacNhanMatKhau) {
            req.session.error = 'Mật khẩu không khớp!';
            return res.redirect('/dangky');
        }

        const userMoi = new TaiKhoan({
            hoVaTen,
            email,
            tenDangNhap,
            matKhau: bcrypt.hashSync(matKhau, 10),
            role: 'user'
        });

        await userMoi.save(); // Bước 2: Lưu xuống DB
        req.session.success = 'Đăng ký thành công!';
        res.redirect('/dangnhap');

    } catch (err) {
        console.error("LỖI ĐĂNG KÝ:", err); // Bước 3: Xem lỗi cụ thể ở Terminal
        req.session.error = 'Lỗi: ' + err.message;
        res.redirect('/dangky');
    }
});

// ==========================================
// 5. LOGIC: XỬ LÝ LƯU TÀI KHOẢN MỚI
// ==========================================
router.post('/dangky', async (req, res) => {
    try {
        const { hoVaTen, tenDangNhap, matKhau, xacNhanMatKhau } = req.body;

        if (matKhau !== xacNhanMatKhau) {
            req.session.error = 'Mật khẩu xác nhận không khớp!';
            return res.redirect('/dangky');
        }

        const userTonTai = await TaiKhoan.findOne({ tenDangNhap });
        if (userTonTai) {
            req.session.error = 'Tên đăng nhập này đã có người sử dụng!';
            return res.redirect('/dangky');
        }

        const salt = bcrypt.genSaltSync(10);
        const matKhauMaHoa = bcrypt.hashSync(matKhau, salt);

        await new TaiKhoan({
            hoVaTen,
            tenDangNhap,
            matKhau: matKhauMaHoa,
            role: 'user', // Tài khoản đăng ký mới luôn là Sinh viên (user)
            khoa: false
        }).save();

        req.session.success = 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.';
        res.redirect('/dangnhap');

    } catch (error) {
        console.error("Lỗi đăng ký: ", error);
        req.session.error = 'Đã xảy ra lỗi hệ thống, vui lòng thử lại!';
        res.redirect('/dangky');
    }
});

module.exports = router;