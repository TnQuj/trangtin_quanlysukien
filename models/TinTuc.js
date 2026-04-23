const mongoose = require('mongoose');

const tinTucSchema = new mongoose.Schema({
    tieuDe: {
        type: String,
        required: true,
        trim: true
    },
    slug: { // Đường dẫn thân thiện, ví dụ: /tin-tuc/hoi-thao-ai-2026
        type: String,
        unique: true
    },
    tomTat: String,
    noiDung: {
        type: String, // Lưu mã HTML từ CKEditor hoặc Quill
        required: true
    },
    hinhAnh: {
        type: String,
        default: '/images/default-news.jpg'
    },
    tacGia: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaiKhoan' // Liên kết với collection tài khoản người viết
    },
    ngayDang: {
        type: Date,
        default: Date.now
    },
    luotXem: {
        type: Number,
        default: 0
    },
    danhMuc: {
        type: String,
        enum: ['Thông báo', 'Hoạt động', 'Kỹ năng', 'Gương sáng'],
        default: 'Hoạt động'
    },
    hienThi: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Tự động tạo slug từ tiêu đề trước khi lưu (giúp SEO và link đẹp hơn)
tinTucSchema.pre('save', function (next) {
    if (this.tieuDe) {
        this.slug = this.tieuDe.toLowerCase()
            .replace(/[^\w ]+/g, '')
            .replace(/ +/g, '-');
    }
    next();
});

module.exports = mongoose.model('TinTuc', tinTucSchema, 'tintuc');