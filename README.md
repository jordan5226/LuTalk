# LuTalk
The Real-time Web Chat App.<br>
Implement with AngularJs framework and MQTT protocal.<br>
Attention: The IE web browser may not be well support LuTalk.<br>
Demo: <a href="http://lutalk.sytes.net" target="_blank">http://lutalk.sytes.net</a><br>

# LuTalk 嚕聊
這是一個即時聊天Web應用 <br>
技術上使用到了AngularJs Framework，以及MQTT<br>
<br>
作為Web開發新手的第一個實作，我選擇了山寨WooTalk當作練習<br>
因此若看倌發覺介面有點熟悉還請不要見怪<br>

# 功能與特性
1. 包含了基本即時聊天所需之功能：發送消息和接收消息<br>
2. 聊天介面上會顯示 "連線已建立/對方已離開" 之狀態提示<br>
3. 聊天介面中，我方送出的消息旁會顯示對方讀取消息之狀態(已讀、未讀)，以及消息發送時的時間戳記<br>
4. 當Web Browser頁面並非停留在LuTalk頁面時(或切換至其他App)，接收到消息會判定為未讀，並發出提示音效，同時網頁標題也會顯示未讀消息數量來提示用戶查收<br>
   2016-09-25更新，支援行動設備Web Browser於背景播放音效，繞過行動設備不支援audio autoplay的限制 ( *目前iOS尚未實測 )<br>
5. 聊天介面中會顯示對方是否正在輸入聊天消息，藉此增強用戶體驗<br>
<br>

尚未有"記錄聊天消息"的功能<br>
也沒有"匿名配對聊天"的功能<br>
這兩個功能都要等到資料庫存取實作後才會有<br>
目前來說，要配對聊天需要輸入自己的名稱與對方的名稱，才能配對<br>
<br>
注意：IE瀏覽器可能沒辦法良好支援
<br>
<br>
# 畫面展示
1. Home page<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_home.png)<br>
2. Build a connection<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_connected.png)<br>
3. Chatting<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_chatting.png)<br>

<br>
<br>
# 問題與建議
歡迎提供意見與想法讓我能參考<br><br>
有BUG也歡迎回報<br>
敬請提問<br>
<br>
<br>
# 環境配置
關於開發過程中具體所需的環境之安裝，請參考以下網頁之詳細講解<br>
<a href="http://eighty20.cc/apps/e2-rtw-v01/index.html" target="_blank" title="即時網頁應用開發 - 手把手">http://eighty20.cc/apps/e2-rtw-v01/index.html</a> <br>
特別要感謝講者整理的一系列教學，獲益良多<br>
