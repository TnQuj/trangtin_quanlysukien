const mongoose = require('mongoose');

const DiaDiemSchema = new mongoose.Schema({
    MaDiaDiem: {
        type: Number,
        required: true,
        unique: true // Đảm bảo mã địa điểm không bị trùng
    },
    MaLoai: {
        type: String,
        required: true
    },
    TenDiaDiem: {
        type: String,
        required: true
    },
    ViDo: {
        type: Number,
        required: true
    },
    KinhDo: {
        type: Number,
        required: true
    },
    DiaChi: {
        type: String
    }
}, {
    // Tùy chọn: tự động tạo trường createdAt và updatedAt
    timestamps: true,
    // Quan trọng: Chỉ định đúng tên collection trong MongoDB của bạn
    collection: 'diadiem'
});

module.exports = mongoose.model('DiaDiem', DiaDiemSchema);