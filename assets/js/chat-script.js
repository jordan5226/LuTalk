/*==================================================================*/
/* Title:          LuTalk 嚕聊 - The Real-time Web Chat App(Script) */
/* Author:         Jordan  Yeh                                      */
/* Date(YY/MM/DD): 2016/08/10                                       */
/* Description:                                                     */
/*   This is an 1 to 1 online chat script for LuTalk.               */
/*   Implement with AngularJs framework and MQTT protocol.          */
/*==================================================================*/

// MQTT配置
var mqtt_client;
var mqtt_broker_host = "5566.noip.me"; // MQTT server hostname/ip
var mqtt_broker_port = 9001;           // MQTT server port

// 消息字串內部分隔符
var strSeparator = "|::|";
		
// Define the module
var rtwApp =angular.module('rtwApp', ['visibilityChange']);
// Define the factory
rtwApp.factory('now', function() {
	return function() {
		return moment().format('HH:mm:ss');
	};
})
// Define the controller
rtwApp.controller('rtwAppCtrl', function($scope, now, VisibilityChange) {
	// 初始化view model的資料與變數
	$scope.vm = {};
	$scope.vm.myname = "";                    // 我的名稱
	$scope.vm.object = "";                    // 對方名稱
	$scope.vm.last_object = "";               // 上一個發送目標
	$scope.vm.message = "";                   // 消息輸入框中的字串
	$scope.vm.stateBtn = "開始聊天";          // 開始聊天按鈕(訂閱主題按鈕)
	$scope.vm.chatLog = [];                   // 聊天記錄
	$scope.vm.has_chatLog = false;            // 是否有聊天記錄
	$scope.vm.myname_subscribed = false;      // 是否有訂閱主題
	$scope.vm.connected = false;              // 雙方是否已連線
	$scope.vm.object_leave = false;           // 對方是否已離開
	$scope.vm.visibility = true;              // 用戶目前是否正在使用當前頁面
	$scope.vm.replychked = false;             // 收到訊息後是否已知會對方已讀
	
	
	// 設定UI會觸發的動作
	$scope.action = {};
	
	/* 連線MQTT SERVER事件 */
	$scope.action.connect = function () {
		console.log("connecting...");
		// 產生MQTT連結client物件的instance
		mqtt_client = new Paho.MQTT.Client(mqtt_broker_host, Number(mqtt_broker_port), Math.uuid(8, 16));
		// 設定某些事件的回呼處理的functions
		mqtt_client.onConnectionLost = onConnectionLost;
		mqtt_client.onMessageArrived = onMessageArrived;
		
		// 連接MQTT Broker
		mqtt_client.connect({onSuccess: onConnect});
	};
	
	/* 傳送訊息按鈕事件 */
	$scope.action.sendMessage = function() {
		if(!$scope.vm.connected) {                                         // 若尚未連線則不可發送消息
			return;
		} else if($scope.vm.object.trim().length == 0
			|| $scope.vm.message.trim().length == 0) {                     // 若必填欄位為空則函數返回
			console.log("Colum can not be blank!");
			return;
		} else if($scope.vm.object.localeCompare($scope.vm.myname) == 0) { // 發送對象不可以是自己
			console.log("Can not send msg to myself!");
			return;
		}
		// 限定消息字串長度
		if($scope.vm.message.trim().length > 495) {
			$scope.vm.message = $scope.vm.message.substr(0, 495);
		}
		var time_now = now();    // 取得當前時間
		$scope.vm.chatLog.push({ // 將消息推入聊天消息列表
			time: time_now,
			state: "未讀",
			name: $scope.vm.myname,
			content: $scope.vm.message
		});
		$scope.vm.has_chatLog = true; // 聊天記錄有消息
		// 發送消息
		sendMsg(time_now + strSeparator + $scope.vm.myname + strSeparator + $scope.vm.message); 
		
		$scope.vm.message = "";
		$scope.vm.last_object = $scope.vm.object; // 暫存上一個發送目標
	};
	
	/* 開始、離開按鈕之訂閱事件 */
	$scope.action.changeState = function() {
		if($scope.vm.myname.trim().length == 0
			|| $scope.vm.object.trim().length == 0) // 若首頁雙input欄位有空值則函數返回
			return;
		// 訂閱或解除訂閱消息
		var myname = $scope.vm.myname;
		if($scope.vm.myname_subscribed == true) {
			// 要解除訂閱
			// 先告訴對方目標我離開了
			if($scope.vm.connected) {            // 若尚未建立連線，則直接解除訂閱
				// 若已建立連線，則發送離開消息
				sendMsg("Quit"+ strSeparator + " " + strSeparator + " ");
			}
			
			mqtt_client.unsubscribe(myname);
			console.log("unsubscribed");
			// UI元件的控制
			$scope.vm.connected = false;         // 連線狀態flag標記為false
			$scope.vm.object_leave = false;      // 對方離開狀態flag標記為false
			$scope.vm.stateBtn = "開始聊天";     // 更換上下線button的label
			$scope.vm.myname_subscribed = false; // 更新flag
			$scope.vm.has_chatLog = false;
			$scope.vm.chatLog = [];
			$scope.vm.message = "";
		} else {
			// 要訂閱訊息主題
			mqtt_client.subscribe(myname);
			// 向對方發送建立連線請求
			sendMsg("Connect"+ strSeparator + " " + strSeparator + " ");
			console.log("subscribed");
			// UI元件的控制
			$scope.vm.stateBtn = "離開";         // 更換上下線button的label
			$scope.vm.myname_subscribed = true;  // 更新flag
			$scope.vm.chatLog = [];              // 先把聊天記錄清空
			$scope.vm.has_chatLog = true;
		}
	};
	
	/* 當成功建立MQTT Broker的連結時會被呼叫的function */
	onConnect = function () {
		console.log("onConnect");
		// UI元件與程式邏輯的控制
		$scope.vm.mqtt_connect = true;
	};
	
	/* 當與MQTT Broker的連結被斷開時會被呼叫的function */
	onConnectionLost = function (responseObject) {
		if(responseObject.errorCode != 0) {
			console.log("onConnectionLost:" + responseObject.errorMessage);
		}
		// UI元件與程式邏輯的控制
		$scope.vm.mqtt_connected = false;
		$scope.vm.connected = false; // 連線狀態flag標記為false
	};
	
	/* (接收到消息) 當訂閱的主題有訊息時會被呼叫的callback function */
	onMessageArrived = function (message) {
		// 打印到Browser的debug console
		console.log("onMessageArrived");
		// 切割收到的消息
		msg = message.payloadString.split(strSeparator);
		
		/* Do: 判斷接收到的消息是否為系統指令 */
		
		// 判斷收到的消息是否為知會已讀消息(Read!)
		if(msg[0].localeCompare("Read!")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare("daeR")==0) {
			// 將$scope.vm.chatLog 聊天記錄中之項目狀態，從未讀改成已讀
			if($scope.vm.chatLog.length !=0) {
				console.log("receive the Read! reply");
				for(var idx in $scope.vm.chatLog) {
					if($scope.vm.chatLog[idx].state.localeCompare("未讀")==0)
						$scope.vm.chatLog[idx].state = "已讀";
				}
			}
			$scope.$apply(); // update ui immediately
			return;
		}
		// 判斷收到的消息是否為建立連線請求(Connect)
		else if(msg[0].localeCompare("Connect")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			// 向對方回送確認消息
			sendMsg("Chk"+ strSeparator + " " + strSeparator + " ");
			return;
		}
		// 判斷收到的消息是否為確認消息(Chk)
		else if(msg[0].localeCompare("Chk")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			// 向對方回送已上線消息
			sendMsg("Online"+ strSeparator + " " + strSeparator + " ");
			$scope.vm.connected = true;     // 連線狀態flag標記為true
			$scope.vm.object_leave = false; // 對方離開狀態flag標記為false
			$scope.$apply();                // update ui immediately
			return;
		}
		// 判斷收到的消息是否為已上線消息(Online)
		else if(msg[0].localeCompare("Online")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			$scope.vm.connected = true;     // 連線狀態flag標記為true
			$scope.vm.object_leave = false; // 對方離開狀態flag標記為false
			$scope.$apply();                // update ui immediately
			return;
		}
		// 判斷收到的消息是否為對方已離開(Quit)
		else if(msg[0].localeCompare("Quit")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			$scope.vm.object_leave = true;  // 對方離開狀態flag標記為true
			$scope.vm.connected = false;    // 連線狀態flag標記為false
			// 在聊天窗口顯示對方離開信息
			// 隨便加個系統消息進聊天列表，以更新content讓捲軸置底
			$scope.vm.chatLog.push({
				time: " ",
				state: "system",
				name: " ",
				content: "對方已離開，請按離開按鈕退出。"
			});
			$scope.$apply(); // update ui immediately
			return;
		}
		
		/* End Do: 判斷接收到的消息是否為系統指令 */
		
		// 把收到的消息放入chatLog陣列
		$scope.vm.chatLog.push({
			time: msg[0],
			state: "received",
			name: msg[1],
			content: msg[2]
		});
		
		$scope.vm.has_chatLog = true;  // 聊天記錄有消息
		$scope.$apply();               // update ui immediately
		
		// 若用戶正在檢視當前頁面，則向對方知會已讀
		if($scope.vm.visibility) {
			replyRead("onMessageArrived, viewing reply"); // 向對方知會已讀
		} else { // 若用戶並未檢視當前頁面
			$scope.vm.replychked = false;                 // 設置收到訊息後尚未知會對方
			// 頁面發出提示音效
			//....
			
			console.log("onMessageArrived but not viewing");
		}
	};
	
	/* MQTT 發送消息函數 */
	sendMsg = function(strMsg) {
		var msg = strMsg;
		var mqtt_msg = new Paho.MQTT.Message(msg);
		mqtt_msg.destinationName = $scope.vm.object;
		mqtt_client.send(mqtt_msg);
	}
	
	/* 向對方知會已讀 */
	replyRead = function(strLog) {
		if($scope.vm.connected) {        // 若尚未連線則不動作
			// 已連線則向對方知會已讀
			sendMsg("Read!"+ strSeparator + " " + strSeparator + "daeR");
			$scope.vm.replychked = true; // 設置收到訊息後已知會對方
			console.log(strLog);
		}
	};
	
	/* 用戶切換回到當前瀏覽器頁面之調用函數 */
	VisibilityChange.onVisible(function() {
		console.log('onVisible callback called at ' + now());
		// 用戶回到當前頁面後，若尚未知會對方已讀，則向對方知會已讀
		if(!$scope.vm.replychked) {
			replyRead("change-back reply"); // 向對方知會已讀
		}
	})
	
	/* 用戶切換到其他瀏覽器頁面之調用函數 */
	VisibilityChange.onHidden(function() {
		console.log('onHidden callback called at ' + now());
	});
	
	/* 頁面切換時之調用函數 */
	VisibilityChange.onChange(function(visible) {
		console.log('onChange callback called at ' + now() + ' with ' + visible);
		$scope.vm.visibility = visible;
	})
});

/* 捲軸永遠置底 */
rtwApp.directive('schrollBottom', ['$timeout', function ($timeout) {
	return {
		scope: {
		  schrollBottom: "="
		},
		link: function ($scope, $element) {
			$scope.$watchCollection('schrollBottom', function (newValue) {
				if (newValue) {
					console.log("newValue");
					$timeout(function(){
						$element[0].scrollTop = $element[0].scrollHeight;
					}, 0);
				}
			});
		}
	}
}]);






// 待更正
rtwApp.directive('noPullToReload', function() {
	'use strict';

	return {
		link: function(scope, element) {
			var initialY = null,
				previousY = null,
				bindScrollEvent = function(e){
					previousY = initialY = e.touches[0].clientY;

					// Pull to reload won't be activated if the element is not initially at scrollTop === 0
					if(element[0].scrollTop <= 16){
						element.on("touchmove", blockScroll);
					}
				},
				blockScroll = function(e){
					if(previousY && previousY < e.touches[0].clientY){ //Scrolling up
						e.preventDefault();
					}
					else if(initialY >= e.touches[0].clientY){ //Scrolling down
						//As soon as you scroll down, there is no risk of pulling to reload
						element.off("touchmove", blockScroll);
					}
					previousY = e.touches[0].clientY;
				},
				unbindScrollEvent = function(e){
					element.off("touchmove", blockScroll);
				};
			element.on("touchstart", bindScrollEvent);
			element.on("touchend", unbindScrollEvent);
		}
	};
});
