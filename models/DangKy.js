const mongoose = require('mongoose');

const dangKySchema = new mongoose.Schema({
    suKien: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Event', 
        required: true 
    },
    taiKhoan: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'TaiKhoan', 
        required: true 
    },
    ngayDangKy: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('DangKy', dangKySchema);