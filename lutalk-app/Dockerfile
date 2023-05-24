# 定義打包的基底Docker Image
FROM node:argon
# 建立app的目錄
RUN mkdir -p /usr/src/app
# 定義工作目錄
WORKDIR /usr/src/app
# 將package.json從現在目錄複製至container裡頭的指定目錄
COPY package.json /usr/src/app/
# 安裝app所需相依的函式庫
RUN npm install
# 將現有目錄所有的檔案都複製至container裡頭的指定目錄
COPY . /usr/src/app
# 定義container會提供服務的tcp埠號
EXPOSE 8080
# 啟動container時所執行的指令
CMD [ "npm", "start" ]
