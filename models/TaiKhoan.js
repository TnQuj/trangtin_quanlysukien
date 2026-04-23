const mongoose = require('mongoose');

const taiKhoanSchema = new mongoose.Schema({
    hoVaTen: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    tenDangNhap: { type: String, required: true, unique: true },
    matKhau: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    khoa: { 
        type: Boolean, 
        default: false     // false = bình thường, true = bị khóa
    },
    ngayTao: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('TaiKhoan', taiKhoanSchema);