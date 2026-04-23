const axios = require('axios');
const cheerio = require('cheerio');

// API để Frontend gọi khi bấm nút "Quét dữ liệu"
app.get('/api/quet-su-kien-agu', async (req, res) => {
    try {
        // 1. Tải toàn bộ HTML từ trang AGU
        const response = await axios.get('https://sao.agu.edu.vn/event/danh-sach-su-kien');
        const html = response.data;

        // 2. Load HTML vào Cheerio để bóc tách
        const $ = cheerio.load(html);
        let ketQuaScrape = [];

        // LƯU Ý: Các class (ví dụ .event-title, .event-date) dưới đây là VÍ DỤ dự đoán. 
        // Khi chạy thực tế, bạn có thể cần F12 (Inspect) trang web AGU để xem chính xác tên class của họ là gì và sửa lại cho đúng.
        $('.event-item, .card, .item').each((index, element) => {
            // Lấy tên sự kiện
            let tenSuKien = $(element).find('h3, h4, .title, .event-name').text().trim();
            // Lấy địa điểm
            let diaDiem = $(element).find('.location, .place, i.fa-map-marker').parent().text().trim();
            // Lấy mô tả
            let moTa = $(element).find('.description, .summary, p').text().trim();

            // Nếu có tên sự kiện thì đưa vào danh sách
            if (tenSuKien) {
                ketQuaScrape.push({
                    tenSuKien,
                    diaDiem: diaDiem || 'Đại học An Giang', // Nếu không quét được thì để mặc định
                    moTa
                });
            }
        });

        // Trả kết quả về cho Frontend
        res.json({ success: true, data: ketQuaScrape });

    } catch (error) {
        console.error("Lỗi khi quét AGU:", error);
        res.status(500).json({ success: false, message: 'Không thể lấy dữ liệu từ AGU lúc này' });
    }
});