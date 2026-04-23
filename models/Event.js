const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    tenSuKien: { type: String, required: true },
    ngay: { type: Date, required: true },
    diaDiem: { type: String, required: true },
    moTa: { type: String },

    // THÊM MỚI: Trường lưu link hình ảnh sự kiện (Banner/Thumbnail)
    hinhAnh: {
        type: String,
        default: '' // Bỏ trống nếu Admin không nhập link ảnh
    },

    soLuongToiDa: {
        type: Number,
        default: 100,           // Mặc định 100 người
        min: 1
    }
}, {
    // THÊM MỚI: Tự động tạo 2 cột createdAt và updatedAt
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);