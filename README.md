# LuTalk
The Real-time Web Chat App.<br>
Implement with AngularJs framework and MQTT protocal.<br>
( Note: The IE web browser may not be well support LuTalk. )<br>
Demo: <a href="http://54.206.107.152:8080/anonymous-chat.html" target="_blank">http://54.206.107.152:8080/anonymous-chat.html</a><br>

# LuTalk 嚕聊
這是一個線上即時聊天Web應用 <br>
技術上使用到了AngularJs Framework，以及MQTT<br>

# 功能與特性
1. 包含了基本即時聊天所需之功能：發送消息和接收消息<br>
2. 聊天介面上會顯示 "連線已建立/對方已離開" 之狀態提示<br>
3. 聊天介面中，我方送出的消息旁會顯示對方讀取消息之狀態(已讀、未讀)，以及消息發送時的時間戳記<br>
4. 當Web Browser頁面並非停留在LuTalk頁面時(或切換至其他App)，接收到消息會判定為未讀，並發出提示音效，同時網頁標題也會顯示未讀消息數量來提示用戶查收<br>
   2016-09-25更新，支援行動設備Web Browser於背景播放音效，繞過行動設備不支援audio autoplay的限制 ( *目前iOS尚未實測 )<br>
5. 聊天介面中會顯示對方是否正在輸入聊天消息，藉此增強用戶體驗<br>
6. anonymous-chat中實作了暫離會話特性，不按離開而是關閉瀏覽器，在下一次返回網頁時會自動恢復會話。
<br>

尚未有"記錄聊天消息"的功能<br>
也沒有"匿名配對聊天"的功能<br>
這兩個功能都要等到資料庫存取實作後才會有<br>
目前來說，要配對聊天需要輸入自己的名稱與對方的名稱，才能配對<br>
<br>
注意：IE瀏覽器可能沒辦法良好支援
<br>
<br>
# Installation
Create a folder named `docker`, and move `lutalk` and `lutalk-app` into `docker`.   
  
**- MQTT**
1. Create folder to store mqtt data  
`mkdir $HOME/docker/service-mqtt/data -p`  

2. Start docker container of the mqtt broker  
   ```
   docker run -p 1883:1883 -p 9001:9001 \
   --name service-mqtt \
   -v $HOME/docker/service-mqtt/data:/mqtt/data:ro \
   -d toke/mosquitto
   ```
3. Check Running Status  
`docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Ports}}"`  

**- Web Service**
1. Build Docker Image  
`cd $HOME/docker/lutalk-app`  
2. Use 'docker build' to build container image  
`docker build -t jordan/lutalk .`  
3. Check if Docker image is completely packed  
`docker images jordan/lutalk`  

4. Run Docker Image  
   ```
   mkdir $HOME/docker/lutalk/public -p   ( If it doesn't exist. )
   docker run -p 8080:8080 --name lutalk -v $HOME/docker/lutalk/public:/usr/src/app/public:rw -d jordan/lutalk
   ```

# 畫面展示
1. Home page<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_home.png)<br>
2. Build a connection<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_connected.png)<br>
3. Chatting<br>
![alt tag](https://raw.githubusercontent.com/jordan5226/LuTalk/master/git-img/lutalk_chatting.png)<br>

