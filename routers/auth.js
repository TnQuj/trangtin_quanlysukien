const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

// Nhúng model Tài khoản (Đảm bảo đường dẫn ra ngoài 1 thư mục '../' là đúng)
const TaiKhoan = require('../models/TaiKhoan');

// ==========================================
// 1. GIAO DIỆN: HIỂN THỊ TRANG ĐĂNG NHẬP
// ==========================================
router.get('/dangnhap', (req, res) => {
    // Nếu người dùng đã đăng nhập rồi mà cố tình gõ url /dangnhap -> Đẩy về trang chủ luôn
    if (req.session.loggedIn) {
        return res.redirect('/');
    }

    // Hiển thị giao diện dangnhap.ejs kèm theo các thông báo lỗi (nếu có)
    res.render('dangnhap', {
        error: req.session.error,
        success: req.session.success
    });

    // Xóa thông báo sau khi đã hiển thị để không bị kẹt lại khi F5
    delete req.session.error;
    delete req.session.success;
});


// ==========================================
// 2. LOGIC: XỬ LÝ DỮ LIỆU KHI BẤM NÚT "ĐĂNG NHẬP"
// ==========================================
router.post('/dangnhap', async (req, res) => {
    try {
        const { tenDangNhap, matKhau } = req.body;

        // Tìm tài khoản trong cơ sở dữ liệu
        const user = await TaiKhoan.findOne({ tenDangNhap });

        // Nếu không tìm thấy user
        if (!user) {
            req.session.error = 'Tên đăng nhập hoặc mật khẩu chưa chính xác';
            return res.redirect('/dangnhap');
        }

        // Kiểm tra xem tài khoản có bị Admin khóa không
        if (user.khoa === true) {
            req.session.error = 'Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin!';
            return res.redirect('/dangnhap');
        }

        // Kiểm tra mật khẩu (so sánh mật khẩu nhập vào với mật khẩu đã mã hóa trong DB)
        if (bcrypt.compareSync(matKhau, user.matKhau)) {

            // ✅ ĐĂNG NHẬP THÀNH CÔNG -> Lưu thông tin vào phiên (Session)
            req.session.loggedIn = true;
            req.session.hoVaTen = user.hoVaTen;
            req.session.userId = user._id;
            req.session.role = user.role;

            // --- ĐIỀU HƯỚNG THÔNG MINH THEO PHÂN QUYỀN ---
            if (user.role === 'admin') {
                return res.redirect('/'); // Admin bay về Trang chủ (Dashboard)
            } else {
                return res.redirect('/sukien'); // User thường về trang Danh sách sự kiện
            }
        }

        // Nếu sai mật khẩu
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
        // Đá về trang đăng nhập
        res.redirect('/dangnhap');
    });
});

// ==========================================
// 4. GIAO DIỆN: HIỂN THỊ TRANG ĐĂNG KÝ
// ==========================================
router.get('/dangky', (req, res) => {
    if (req.session.loggedIn) {
        return res.redirect('/');
    }
    res.render('dangky', { error: req.session.error });
    delete req.session.error;
});

// ==========================================
// 5. LOGIC: XỬ LÝ LƯU TÀI KHOẢN MỚI
// ==========================================
router.post('/dangky', async (req, res) => {
    try {
        const { hoVaTen, tenDangNhap, matKhau, xacNhanMatKhau } = req.body;

        // 1. Kiểm tra mật khẩu có khớp không
        if (matKhau !== xacNhanMatKhau) {
            req.session.error = 'Mật khẩu xác nhận không khớp!';
            return res.redirect('/dangky');
        }

        // 2. Kiểm tra tài khoản đã tồn tại chưa
        const userTonTai = await TaiKhoan.findOne({ tenDangNhap });
        if (userTonTai) {
            req.session.error = 'Tên đăng nhập này đã có người sử dụng!';
            return res.redirect('/dangky');
        }

        // 3. Mã hóa mật khẩu và Lưu vào Database
        const salt = bcrypt.genSaltSync(10);
        const matKhauMaHoa = bcrypt.hashSync(matKhau, salt);

        await new TaiKhoan({
            hoVaTen,
            tenDangNhap,
            matKhau: matKhauMaHoa,
            role: 'user', // Tài khoản đăng ký mới luôn là Sinh viên (user)
            khoa: false
        }).save();

        // 4. Báo thành công và đẩy về trang đăng nhập
        req.session.success = 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.';
        res.redirect('/dangnhap');

    } catch (error) {
        console.error("Lỗi đăng ký: ", error);
        req.session.error = 'Đã xảy ra lỗi hệ thống, vui lòng thử lại!';
        res.redirect('/dangky');
    }
});

module.exports = router;