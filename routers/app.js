const axios = require('axios');
const cheerio = require('cheerio');

app.get('/api/quet-su-kien-agu', async (req, res) => {
    try {
        const response = await axios.get('https://sao.agu.edu.vn/event/danh-sach-su-kien');
        const html = response.data;

        const $ = cheerio.load(html);
        let ketQuaScrape = [];

        $('.event-item, .card, .item').each((index, element) => {
            let tenSuKien = $(element).find('h3, h4, .title, .event-name').text().trim();
            let diaDiem = $(element).find('.location, .place, i.fa-map-marker').parent().text().trim();
            let moTa = $(element).find('.description, .summary, p').text().trim();

            // Nếu có tên sự kiện thì đưa vào danh sách
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
        res.status(500).json({ success: false, message: 'Không thể lấy dữ liệu từ AGU lúc này' });
    }
});