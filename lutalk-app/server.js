// 引入"Express.js"的函式庫
const express = require('express');
// 定義要使用的tcp port
const PORT = 8080;
// 產生一個Express的instance
const app = express();	
// 設定使用"public"目錄來作為網頁的根目錄
app.use(express.static('public'));
// 產生一個http的get服務	
app.get('/', function (req, res) {
    res.send('Hello world\n');
});
// 聆聽使用的tcp port的request
app.listen(PORT);
// 打印訊息來標註服務的運行
console.log('Running on http://localhost:' + PORT);
