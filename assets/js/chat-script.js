/*==================================================================*/
/* Title:          LuTalk 嚕聊 - The Real-time Web Chat App(Script) */
/* Author:         Jordan  Yeh                                      */
/* Date(YY/MM/DD): 2016/08/11                                       */
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

// 消息字串最大長度
var nMaxLen_Msg = 495;
		
// Define the module
var luTalkApp =angular.module('luTalkApp', ['visibilityChange']);

// Define the factory
// 獲取時間
luTalkApp.factory('now', function() {
	return function() {
		return moment().format('HH:mm:ss');
	};
})

// Define the controller
luTalkApp.controller('luTalkAppCtrl', function($scope, now, VisibilityChange) {
	// 初始化view model的資料與變數
	$scope.vm = {};
	$scope.vm.strMyname = "";                    // 我的名稱
	$scope.vm.strObject = "";                    // 對方名稱
	$scope.vm.last_object = "";                  // 上一個發送目標
	$scope.vm.strMessage = "";                   // 消息輸入框中的字串
	$scope.vm.stateBtn = "開始聊天";             // 開始聊天按鈕(訂閱主題按鈕)
	$scope.vm.chatLog = [];                      // 聊天記錄
	$scope.vm.bHasChatlog = false;               // 是否有聊天記錄
	$scope.vm.bSubscribed_strMyname = false;     // 是否有訂閱主題
	$scope.vm.bConnected = false;                // 雙方是否已連線
	$scope.vm.bLeave_strObject = false;          // 對方是否已離開
	$scope.vm.bVisibility = true;                // 用戶目前是否正在使用當前頁面
	$scope.vm.bChked_And_Reply = false;          // 收到訊息後是否已知會對方已讀
	$scope.vm.nUnread = 0;                       // 未讀的消息數量
	$scope.vm.bPlaySound = false;                // 是否發出提示音效
	$scope.vm.pageTitle = "LuTalk 嚕聊 （Angular Framework Demo）";    // 頁面標題
	$scope.vm.defaultTitle = "LuTalk 嚕聊 （Angular Framework Demo）"; // 預設標題
	$scope.event = { 'audios': ["incomingMsg.wav"]};                   // 提示音效文件名
	
	
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
		if(!$scope.vm.bConnected) {                                              // 若尚未連線則不可發送消息
			return;
		} else if($scope.vm.strObject.trim().length == 0
			|| $scope.vm.strMessage.trim().length == 0) {                        // 若必填欄位為空則函數返回
			console.log("Colum can not be blank!");
			return;
		} else if($scope.vm.strObject.localeCompare($scope.vm.strMyname) == 0) { // 發送對象不可以是自己
			console.log("Can not send msg to myself!");
			return;
		}
		
		// 限定消息字串長度
		if($scope.vm.strMessage.trim().length > nMaxLen_Msg) {
			$scope.vm.strMessage = $scope.vm.strMessage.substr(0, nMaxLen_Msg);
		}
		
		var time_now = now();         // 取得當前時間
		$scope.vm.chatLog.push({      // 將消息推入聊天消息列表
			time: time_now,
			state: "未讀",
			name: $scope.vm.strMyname,
			content: $scope.vm.strMessage
		});
		$scope.vm.bHasChatlog = true; // 聊天記錄有消息
		
		// 發送消息
		var newMsg = "";
		var tmpMsg = $scope.vm.strMessage.split(strSeparator); // 用戶的input message雍正一下
		for(var idx in tmpMsg) {                               // 將切割後的字串合併成一個字串
			newMsg += tmpMsg[idx];
		}
		sendMsg(time_now + strSeparator + $scope.vm.strMyname + strSeparator + newMsg); // 發送消息
		
		$scope.vm.strMessage = "";                   // 用戶input欄位清空
		$scope.vm.last_object = $scope.vm.strObject; // 暫存上一個發送目標
	};
	
	/* 開始、離開按鈕之訂閱事件 */
	$scope.action.changeState = function() {
		if($scope.vm.strMyname.trim().length == 0
			|| $scope.vm.strObject.trim().length == 0) // 若首頁雙input欄位有空值則函數返回
			return;
		
		// 訂閱或解除訂閱消息
		var myname = $scope.vm.strMyname;
		if($scope.vm.bSubscribed_strMyname == true) {
			// DO: 要解除訂閱
			// 先告訴對方目標我離開了
			if($scope.vm.bConnected) {               // 若尚未建立連線，則直接解除訂閱
				// 若已建立連線，則發送離開消息
				sendMsg("Quit"+ strSeparator + " " + strSeparator + " ");
			}
			if(!$scope.vm.bLeave_strObject)          // 當對方離開後則不再"取消訂閱對方"，因為在對方離開時已經先取消訂閱了
				mqtt_client.unsubscribe(myname);     // 對方還沒離開時才取消訂閱對方
			console.log("unsubscribed");
			// UI元件的控制
			setDefaultTitle();                       // 改回預設標題
			$scope.vm.bConnected = false;            // 連線狀態flag標記為false
			$scope.vm.bLeave_strObject = false;      // 對方離開狀態flag標記為false
			$scope.vm.stateBtn = "開始聊天";         // 更換上下線button的label
			$scope.vm.bSubscribed_strMyname = false; // 更新flag
			$scope.vm.bHasChatlog = false;           // 聊天記錄無消息
			$scope.vm.chatLog = [];                  // 把聊天記錄清空
			$scope.vm.strMessage = "";               // 用戶消息輸入框清空
		} else {
			// DO: 要訂閱訊息主題
			mqtt_client.subscribe(myname);
			// 向對方發送建立連線請求
			sendMsg("Connect"+ strSeparator + " " + strSeparator + " ");
			console.log("subscribed");
			// UI元件的控制
			$scope.vm.stateBtn = "離開";             // 更換上下線button的label
			$scope.vm.bSubscribed_strMyname = true;  // 更新flag
			$scope.vm.chatLog = [];                  // 先把聊天記錄清空
			$scope.vm.bHasChatlog = true;
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
		$scope.vm.bConnected = false; // 連線狀態flag標記為false
	};
	
	/* (接收到消息) 當訂閱的主題有訊息時會被呼叫的callback function */
	onMessageArrived = function (message) {
		// 打印到Browser的debug console
		console.log("onMessageArrived");
		// 切割收到的消息
		var msg = message.payloadString.split(strSeparator);
		
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
			$scope.vm.bConnected = true;        // 連線狀態flag標記為true
			$scope.vm.bLeave_strObject = false; // 對方離開狀態flag標記為false
			$scope.$apply();                    // update ui immediately
			return;
		}
		// 判斷收到的消息是否為已上線消息(Online)
		else if(msg[0].localeCompare("Online")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			$scope.vm.bConnected = true;        // 連線狀態flag標記為true
			$scope.vm.bLeave_strObject = false; // 對方離開狀態flag標記為false
			$scope.$apply();                    // update ui immediately
			return;
		}
		// 判斷收到的消息是否為對方已離開(Quit)
		else if(msg[0].localeCompare("Quit")==0 && msg[1].localeCompare(" ")==0
			&& msg[2].localeCompare(" ")==0) {
			mqtt_client.unsubscribe($scope.vm.strMyname); // 取消訂閱對方
			$scope.vm.bLeave_strObject = true;            // 對方離開狀態flag標記為true
			$scope.vm.bConnected = false;                 // 連線狀態flag標記為false
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
		
		$scope.vm.bHasChatlog = true;  // 聊天記錄有消息
		$scope.$apply();               // update ui immediately
		
		// 若用戶正在檢視當前頁面，則向對方知會已讀
		if($scope.vm.bVisibility) {
			replyRead("onMessageArrived, viewing reply");       // 向對方知會已讀
		} else { // 若用戶並未檢視當前頁面
			$scope.vm.bChked_And_Reply = false;                 // 設置收到訊息後尚未知會對方
			setTitle(++$scope.vm.nUnread);                      // 未讀消息計數加一並改變標題
			// 頁面發出提示音效
			$scope.vm.bPlaySound = false;
			$scope.$apply();               // update ui immediately
			$scope.vm.bPlaySound = true;
			$scope.$apply();               // update ui immediately
			console.log("onMessageArrived but not viewing");
		}
	};
	
	/* MQTT 發送消息函數 */
	sendMsg = function(strMsg) {
		var msg = strMsg;
		var mqtt_msg = new Paho.MQTT.Message(msg);
		mqtt_msg.destinationName = $scope.vm.strObject;
		mqtt_client.send(mqtt_msg);
	}
	
	/* 向對方知會已讀 */
	replyRead = function(strLog) {
		if($scope.vm.bConnected) {             // 若尚未連線則不動作
			// 已連線則向對方知會已讀
			sendMsg("Read!"+ strSeparator + " " + strSeparator + "daeR");
			$scope.vm.bChked_And_Reply = true; // 設置收到訊息後已知會對方
			console.log(strLog);
		}
	};
	
	/* 將網頁標題設為預設字串*/
	setDefaultTitle = function() {
		$scope.vm.nUnread = 0;
		$scope.vm.pageTitle = $scope.vm.defaultTitle;
	};
	
	/* 將網頁標題根據未讀消息數量做改變*/
	setTitle = function(nUnread) {
		$scope.vm.pageTitle = "(" + nUnread + ") " + $scope.vm.defaultTitle;
	}
	
	/* 用戶切換回到當前瀏覽器頁面之調用函數 */
	VisibilityChange.onVisible(function() {
		console.log('onVisible callback called at ' + now());
		// 用戶回到當前頁面後，若尚未知會對方已讀，則向對方知會已讀
		if(!$scope.vm.bChked_And_Reply) {
			replyRead("change-back reply"); // 向對方知會已讀			
			setDefaultTitle();              // 改回預設標題
		}
	})
	
	/* 用戶切換到其他瀏覽器頁面之調用函數 */
	VisibilityChange.onHidden(function() {
		console.log('onHidden callback called at ' + now());
	});
	
	/* 頁面切換時之調用函數 */
	VisibilityChange.onChange(function(visible) {
		console.log('onChange callback called at ' + now() + ' with ' + visible);
		$scope.vm.bVisibility = visible; // 設置用戶目前是否正在使用當前頁面
	})
});

/* 捲軸永遠置底 */
luTalkApp.directive('schrollBottom', ['$timeout', function ($timeout) {
	return {
		scope: {
		  schrollBottom: "="
		},
		link: function ($scope, $element) {
			$scope.$watchCollection('schrollBottom', function (newValue) {
				if (newValue) {
					console.log("schrollBottom");
					$timeout(function(){
						$element[0].scrollTop = $element[0].scrollHeight;
					}, 0);
				}
			});
		}
	}
}]);

/* 消息提示音 */
luTalkApp.directive('audios', function($sce) {
  return {
    restrict: 'A',
    scope: { code: '=' },
    replace: true,
    template: '<audio ng-src="{{url}}" controls autoplay></audio>',
    link: function (scope) {
        scope.$watch('code', function (newVal, oldVal) {
           if (newVal !== undefined) {
               scope.url = $sce.trustAsResourceUrl("assets/media/" + newVal);
           }
        });
    }
  };
});
