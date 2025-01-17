import httpRequest from '../api/httpRequest.js'
import Vue from "vue";
export default {

	state: {
		activeIndex: -1,
		chats: [
			{}
		]
	},

	method:{
		ifSameSession(s1,s2){

			return false;
		}
	},

	mutations: {
		initChatStore(state) {
			//state.activeIndex = -1;
		},
		openChat(state, chatInfo) {
			for (let i in state.chats) {
				if (state.chats[i].type === chatInfo.type &&
					state.chats[i].targetId === chatInfo.targetId) {
					let newChat = state.chats[i];
					// 放置头部
					state.chats.splice(i, 1);
					state.chats.unshift(newChat);
					return;
				}
			}
			state.activeIndex = -1;
			httpRequest({
				url: '/chatSession/save',
				method: 'post',
				data:{
					"targetId":chatInfo.targetId,
					"chatType":chatInfo.type
				}
			}).then((data) => {
				let tmpChat = {
					targetId: chatInfo.targetId,
					type: chatInfo.type,
					showName: chatInfo.showName,
					headImage: chatInfo.headImage,
					lastContent: "",
					lastSendTime: new Date().getTime(),
					unreadCount: 0,
					messages: [],
				};
				this.commit("chatUnshift",tmpChat);
			}).catch((err) => {
			});
		},

		chatUnshift(state,newChat){
			let activeChat = state.activeIndex>=0?state.chats[state.activeIndex]:null;
			state.chats.unshift(newChat);
			// 选中会话保持不变
			if(activeChat){
				state.chats.forEach((chat,idx)=>{
					if(activeChat.type == chat.type
						&& activeChat.targetId == chat.targetId){
						state.activeIndex = idx;
					}
				})
			}
		},
		activeChat(state, idx) {
			state.activeIndex = idx;
			state.chats[idx].unreadCount = 0;
		},
		removeChat(state, idx) {
			state.chats.splice(idx, 1);
			if (state.activeIndex >= state.chats.length) {
				state.activeIndex = state.chats.length - 1;
			}
		},
		removeGroupChat(state, groupId) {
			for (let idx in state.chats) {
				if (state.chats[idx].type == 'GROUP' &&
					state.chats[idx].targetId == groupId) {
					this.commit("removeChat", idx);
				}
			}
		},
		removePrivateChat(state, userId) {
			for (let idx in state.chats) {
				if (state.chats[idx].type == 'PRIVATE' &&
					state.chats[idx].targetId == userId) {
					this.commit("removeChat", idx);
				}
			}
		},
		insertMessage(state, msgInfo) {
			// 获取对方id或群id
			let type = msgInfo.groupId>=0 ? 'GROUP' : 'PRIVATE';
			let targetId = msgInfo.groupId>=0 ? msgInfo.groupId : msgInfo.selfSend ? msgInfo.recvId : msgInfo.sendId;
			let chat = null;
			for (let idx in state.chats) {
				if (state.chats[idx].type == type &&
					state.chats[idx].targetId === targetId) {
					chat = state.chats[idx];
					break;
				}
			}
			// 插入新的数据
			if(msgInfo.type == 1){
				chat.lastContent =  "[图片]";
			}else if(msgInfo.type == 2){
				chat.lastContent = "[文件]";
			}else if(msgInfo.type == 3){
				chat.lastContent = "[语音]";
			}else{
				chat.lastContent =  msgInfo.content;
			}
			chat.lastSendTime = msgInfo.sendTime;
			// 如果不是当前会话，未读加1
			chat.unreadCount++;
			if(msgInfo.selfSend){
				chat.unreadCount=0;
			}
			// 如果是已存在消息，则覆盖旧的消息数据
			for (let idx in chat.messages) {
				if(msgInfo.id && chat.messages[idx].id == msgInfo.id){
					Object.assign(chat.messages[idx], msgInfo);
					return;
				}
				// 正在发送中的消息可能没有id,通过发送时间判断
				if(msgInfo.selfSend && chat.messages[idx].selfSend
				&& chat.messages[idx].sendTime == msgInfo.sendTime){
					Object.assign(chat.messages[idx], msgInfo);
					return;
				}
			}
			// 新的消息
			chat.messages.push(msgInfo);
			
		},
		deleteMessage(state, msgInfo){
			// 获取对方id或群id
			let type = msgInfo.groupId ? 'GROUP' : 'PRIVATE';
			let targetId = msgInfo.groupId ? msgInfo.groupId : msgInfo.selfSend ? msgInfo.recvId : msgInfo.sendId;
			let chat = null;
			for (let idx in state.chats) {
				if (state.chats[idx].type == type &&
					state.chats[idx].targetId === targetId) {
					chat = state.chats[idx];
					break;
				}
			}
			
			for (let idx in chat.messages) {
				// 已经发送成功的，根据id删除
				if(chat.messages[idx].id && chat.messages[idx].id == msgInfo.id){
					chat.messages.splice(idx, 1);
					break;
				}
				// 正在发送中的消息可能没有id，根据发送时间删除
				if(msgInfo.selfSend && chat.messages[idx].selfSend 
				&&chat.messages[idx].sendTime == msgInfo.sendTime){
					chat.messages.splice(idx, 1);
					break;
				}
			}
		},
		updateChatFromFriend(state, friend) {
			for (let i in state.chats) {
				let chat = state.chats[i];
				if (chat.type=='PRIVATE' && chat.targetId == friend.id) {
					chat.headImage = friend.headImageThumb;
					chat.showName = friend.nickName;
					break;
				}
			}
		},
		updateChatFromGroup(state, group) {
			for (let i in state.chats) {
				let chat = state.chats[i];
				if (chat.type=='GROUP' && chat.targetId == group.id) {
					chat.headImage = group.headImageThumb;
					chat.showName = group.remark;
					break;
				}
			}
		},
		resetChatStore(state) {
			state.activeIndex = -1;
			state.chats = [];
		},
		resetMessageList(state,chatList) {
			if(chatList===undefined){
				return;
			}
			state.activeIndex = -1;
			for(const element of chatList) {
				state.chats.push(element)
			}
			state.chats= chatList;
			if(chatList.length>0){
				state.activeIndex = 0;
			}
		},
		pullMessageList(state) {
			state.activeIndex = -1;
			state.chats = [];
			httpRequest({
				url: '/chatSession/list',
				method: 'get',
			}).then((data) => {
				if(data===undefined || data.length<1){
					return;
				}
				let tmp = [];
				for (const element of data) {
					let item = element;
					let chart = {
						targetId:item.targetId,
						type: item.chatType,
						showName:item.name,
						headImage: item.headImage,
						lastContent:item.lastContent,
						lastSendTime: item.lastSendTime,
						unreadCount: item.unreadCount,
						messages: []
					};
					tmp.push(chart);
				}
				this.commit("resetMessageList",tmp)
			}).catch((err) => {
			});
		}
	},

}
