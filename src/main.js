import components from './html/components';
import settings from './settings';

let config = {
	attributes: false,
	childList: true,
	characterData: false,
	subtree: true
};

let chatRoom;
let chatSelector;
let chatList;
let messageHistory = [''];
let currMessage = 0;
let inputSelector;
let chatSendBtn;
let onlineFriends;
let friendList = [];
let foundFriends = false;
let chatInputBtns;
let topNav;
let mainPage;
let blockedUsersList;

let twitchCommands = ['help', 'w', 'me', 'disconnect', 'mods', 'color', 'commercial', 'mod', 'unmod', 'ban', 'unban', 'timeout', 'untimeout', 'slow', 'slowoff', 'r9kbeta', 'r9kbetaoff', 'emoteonly', 'emoteonlyoff', 'clear', 'subscribers', 'subscribersoff', 'followers', 'followersoff', 'host', 'unhost'];
let aliases = {};
if (localStorage.tmtAliases) {
	aliases = JSON.parse(localStorage.tmtAliases);
}

let blockedEmotes = [];
if (localStorage.tmtBlockedEmotes) {
	blockedEmotes = localStorage.tmtBlockedEmotes.split(',');
}

let blockedUsers = [];
if (localStorage.twitchBlockList) {
	blockedUsers = localStorage.twitchBlockList.split(',');
	for (let i = 0; i < blockedUsers.length; i++) {
		blockedUsers[i] = blockedUsers[i].toLowerCase();
	}
}

let highlightWords = [];
if (localStorage.tmtHighlights) {
	highlightWords = localStorage.tmtHighlights.split(',');
	for (let i = 1; i < highlightWords.length; i++) {
		highlightWords[i] = highlightWords[i].replace(/\s/g, '');
	}
}

//Mutation observer for each chat message
let chatObserver = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		mutation.addedNodes.forEach(function (addedNode) {
			if (addedNode.nodeName == 'DIV') {
				// Moderator actions
				if (chatRoom.isCurrentUserModerator) {
					if (addedNode.classList.contains('chat-line__message')) {
						if (findReact(addedNode).memoizedProps.showModerationIcons === true) {
							let message = findReact(addedNode);
							if (!(message.memoizedProps.message.hasOwnProperty('_ffz_checked'))) {
								addPurgeButton(addedNode);
							}
						}
					}
					if (addedNode.classList.contains('viewer-card-layer__draggable')) {
						let name = findReact(document.querySelector('.viewer-card-layer'), 2).memoizedProps.viewerCardOptions.targetLogin;
						if (name != chatRoom.currentUserLogin) {
							let check = setInterval(function () {
								if (document.querySelector('.viewer-card')) {
									clearInterval(check);
									addModCard();
								}
							}, 50);
						}
					}
				}
				// recieve new message
				if (addedNode.classList.contains('chat-line__message')) {
					let message = findReact(addedNode);
					let from = message.memoizedProps.message.user.userDisplayName;
					// highlight friends
					if (localStorage.tmtHighlightFriend == 'true' && friendList.includes(from) && !(addedNode.classList.contains('ffz-mentioned'))) {
						addedNode.classList.add('tu-highlight-friend');
					}
					// block emotes
					let parts = message.memoizedProps.message.messageParts;
					let imgs = addedNode.getElementsByTagName('img');
					let emotes = [];
					for (let t = 0; t < imgs.length; t++) {
						if (imgs[t].classList.contains('chat-line__message--emote')) {
							emotes.push(imgs[t]);
						}
					}
					let emoteN = 0;
					for (let i = 0; i < parts.length; i++) {
						if (parts[i].type == 4) {
							if (blockedEmotes.includes(parts[i].content.alt)) {
								let n = parts[i].content.images.sources;
								n['1x'] = 'https://raw.githubusercontent.com/ColossalPercy/twitch_mod_tools/master/assets/blank_28x.png';
								n['2x'] = 'https://raw.githubusercontent.com/ColossalPercy/twitch_mod_tools/master/assets/blank_56x.png';
								n['4x'] = 'https://raw.githubusercontent.com/ColossalPercy/twitch_mod_tools/master/assets/blank_112x.png';
								emotes[emoteN].src = 'https://raw.githubusercontent.com/ColossalPercy/twitch_mod_tools/master/assets/blank_28x.png';
								emotes[emoteN].srcset = '';
							}
							emoteN++;
						}
					}
					// block Users
					if (blockedUsers.includes(from.toLowerCase())) {
						chatList.removeChild(addedNode);
					}
				}
			}
		});
	});
});

//Mutation observer for elements loading
let elLoader = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		chatSelector = document.querySelector('[data-test-selector="chat-room-component-layout"]');
		if (chatSelector) {
			// get the chat room
			chatRoom = findReactChat(chatSelector);
			chatObserver.observe(chatSelector, config);
			// get chat text input
			inputSelector = document.querySelector('[data-test-selector="chat-input"]');
			inputSelector.onkeydown = checkKey;
			// get chat send button
			chatSendBtn = document.querySelector('[data-test-selector="chat-send-button"]');
			chatSendBtn.onclick = checkMessage;
			// get chat messages list
			chatList = document.querySelector('.chat-list__lines').SimpleBar.contentEl.children[0];
			// hijack the viewer card
			if (chatList.onclick == null && !window.ffz) {
				chatList.onclick = function (e) {
					let classes = e.target.classList;
					if (classes.contains('chat-author__display-name') || classes.contains('chat-author__intl-login') || classes.contains('chat-line__username')) {
						let props = findReact(e.target, 2).memoizedProps;
						let userData = props.userData || props.message.user;
						let check = setInterval(function () {
							if (document.querySelector('.viewer-card')) {
								clearInterval(check);
								let dn = document.querySelector('.viewer-card__display-name');
								let dataCont;
								if (dn) {
									dataCont = dn.parentElement;
									dataCont.removeChild(dn);
								} else {
									let tuCard = document.querySelector('.tu-viewer-card');
									dataCont = tuCard.parentElement;
									dataCont.removeChild(tuCard);
								}
								dataCont.insertAdjacentHTML('beforeend', components.viewerCard.tuCard);
								let lk = document.querySelector('.tu-viewer-card-link');
								lk.href = '/' + userData.userLogin.toLowerCase();
								lk.innerHTML = userData.userDisplayName;
								document.querySelector('.tu-name-history-button').onclick = toggleVisibility;
								updateCardInfo(userData.userLogin);
							}
						}, 50);
					}
				};
			}
			// get online friend list
			onlineFriends = document.querySelector('.online-friends');
			if (!foundFriends && friendList.length === 0) {
				getFriendList();
			}
			// get top nav bar
			topNav = document.querySelector('.top-nav');
			// get main page
			mainPage = topNav.parentElement;
			// add settings gui
			if (!(document.querySelector('.tu-settings-gui'))) {
				mainPage.insertAdjacentHTML('beforeend', components.settings.gui);
				document.querySelector('.tu-settings-close').onclick = toggleVisibility;
				settings();
			}
			// add settings button
			chatInputBtns = document.querySelector('.chat-input__buttons-container').children[0];
			if (!(document.querySelector('.tu-settings-button'))) {
				chatInputBtns.insertAdjacentHTML('beforeend', components.icons.settings);
				document.querySelector('.tu-settings-button').onclick = toggleVisibility;
			}
			// add twitch blocker
			if (!(document.querySelector('.tu-block-button'))) {
				chatInputBtns.insertAdjacentHTML('beforeend', components.icons.block);
				document.querySelector('.tu-block-button').onclick = toggleVisibility;
				document.querySelector('.tu-block-add-user').onclick = addBlockedUser;
				blockedUsersList = document.querySelector('.tu-block-user-list');
				blockedUsers.forEach(function (id) {
					var user = `
            			<div class="tw-mg-t-1" >
                			<button class="blocked-user-${id}">${id}</button>
            			</div>`;
					blockedUsersList.insertAdjacentHTML('beforeend', user);
					document.querySelector('.blocked-user-' + id).onclick = removeBlockedUser;
				});
			}
		}
	});
});
elLoader.observe(document.body, config);

var css = document.createElement('link');
if (localStorage.tmtDev == 'true') {
	css.href = 'http://127.0.0.1:3000/src/styles/styles.css';
} else {
	css.href = 'https://rawgit.com/ColossalPercy/twitch_mod_tools/master/src/styles/styles.css';
}
css.type = 'text/css';
css.rel = 'stylesheet';
document.getElementsByTagName('head')[0].appendChild(css);

function chatPurge() {
	let name = getUserName(this.parentElement.parentElement);
	sendMessage('/timeout ' + name + ' 1');
}

function cardTimeout() {
	let name = findReact(document.querySelector('.viewer-card-layer'), 2).memoizedProps.viewerCardOptions.targetLogin;
	let time = this.getAttribute('data-tu-timeout');
	let reason = document.querySelector('.tu-ban-reason').value;
	sendMessage('/timeout ' + name + ' ' + time + ' ' + reason);
}

function sendMessage(m) {
	chatRoom.onSendMessage(m);
}

function addPurgeButton(el) {
	el.querySelector('[data-test-selector="chat-timeout-button"]').parentElement.insertAdjacentHTML('beforeend', components.icons.purge);
	let btn = el.querySelector('[data-test-selector="chat-purge-button"]');
	btn.onclick = chatPurge;
}

function addModCard() {
	document.querySelector('.viewer-card__actions').insertAdjacentHTML('beforeend', components.modCard.actions);
	let timeouts = document.getElementsByClassName('tu-timeout');
	for (let i = 0; i < timeouts.length; i++) {
		timeouts[i].onclick = cardTimeout;
	}
}

function getUserName(el) {
	let name;
	name = findReact(el).memoizedProps.message.user.userLogin;
	return name;
}

function checkKey(e) {
	e = e || window.event;
	if (e.keyCode == '38' && currMessage < (messageHistory.length - 1)) {
		// up arrow
		currMessage++;
		changeMessage();
	} else if (e.keyCode == '40' && currMessage > 0) {
		// down arrow
		currMessage--;
		changeMessage();
	} else if (e.keyCode == '13' && inputSelector.value) {
		// enter key
		checkMessage();
	}
}

function checkMessage() {
	let msg = inputSelector.value;
	if (currMessage != 0) {
		messageHistory.splice(currMessage, 1);
		currMessage = 0;
	}
	messageHistory.splice(1, 0, msg);

	if (msg.charAt(0) == '/') {
		msg = msg.substr(1);
		let parts = msg.split(' ');
		let command = parts[0].toLowerCase();

		if (twitchCommands.indexOf(command) > -1) {
			return;
		}
		findReact(inputSelector, 3).memoizedProps.onValueUpdate('');
		inputSelector.value = '';
		// check if tu command or user alias
		if (command === 'alias') {
			let err = false;
			let errTxt = 'Usage: /alias <name> <alias>';
			let name, alias;
			if (parts.length > 1) {
				name = parts[1].toLowerCase();
				alias = parts.splice(2).join(' ');
			} else {
				err = true;
			}
			if (name) {
				// check if a default twitch command
				if (twitchCommands.includes(name)) {
					err = true;
					errTxt = "Can't use a Twitch command as an alias!";
				} else if (name === 'delete' && alias) {
					if (aliases.hasOwnProperty(alias)) {
						delete aliases[alias];
						sendStatus('Removed alias: ' + alias);
					} else {
						sendStatus('Alias ' + alias + ' does not exist!');
					}
				} else if (name === 'list') {
					if (Object.keys(aliases).length == 0) {
						sendStatus('No current aliases.', true);
					} else {
						sendStatus('Current aliases:', true);
						for (let k in aliases) {
							let txt = k + ': ' + aliases[k];
							sendStatus(txt, false, true);
						}
					}
				} else if (name === 'importffz') {
					let splitPos = [];
					let pos, t;
					if (localStorage.ffz_setting_command_aliases) {
						let f = localStorage.ffz_setting_command_aliases;
						while (pos != -1) {
							pos = f.indexOf('"', i + 1);
							i = pos;
							if (pos > 0) {
								splitPos.push(pos);
							}
						}
						for (let i = 0; i < splitPos.length; i += 4) {
							let str1 = f.substr(splitPos[i] + 1, splitPos[i + 1] - splitPos[i] - 1).toLowerCase();
							let str2 = f.substr(splitPos[i + 2] + 1, splitPos[i + 3] - splitPos[i + 2] - 1);
							aliases[str1] = str2;
						}
						sendStatus('Imported all aliases from FFZ! Run "/alias list" to view.');
					} else {
						err = true;
					}
				} else if (alias) {
					aliases[name] = alias;
					sendStatus('Created alias: ' + name);
				} else {
					err = true;
				}
				localStorage.tmtAliases = JSON.stringify(aliases);
			} else {
				err = true;
			}
			if (err === true) {
				if (name === 'delete') {
					errTxt = 'Usage: /alias delete <name>';
				} else if (name === 'importffz') {
					errTxt = 'No FFZ aliases found!';
				}
				sendStatus(errTxt);
			}
		} else if (aliases.hasOwnProperty(command)) {
			sendMessage(aliases[command]);
		} else if (command == 'b') {
			sendMessage('/ban ' + parts.splice(1).join(' '));
		} else if (command == 'u') {
			sendMessage('/unban ' + parts.splice(1).join(' '));
		} else if (command == 'p' || command == 'purge') {
			sendMessage('/timeout ' + parts.splice(1).join(' ') + ' 1');
		} else if (command == 't') {
			let ext;
			if (parts.length == 2) {
				ext = parts[1] + ' 600';
			} else {
				ext = parts.splice(1).join(' ');
			}
			sendMessage('/timeout ' + ext);
		} else {
			sendMessage('/' + msg);
		}
	}
}

function sendStatus(txt, b = false, i = false) {
	let sDiv = document.createElement('div');
	sDiv.setAttribute('class', 'chat-line__status');
	let sSpan = document.createElement('span');
	if (b) {
		sSpan.style.fontWeight = 'bold';
	}
	if (i) {
		sDiv.style.marginLeft = '20px';
	}
	sSpan.textContent = txt;
	sDiv.appendChild(sSpan);
	chatList.appendChild(sDiv);
	chatList.parentElement.scrollIntoView(false);
}

function getFriendList() {
	let friends = findReact(onlineFriends).memoizedProps.friends;
	for (let i = 0; i < friends.length; i++) {
		friendList[i] = friends[i].node.displayName;
	}
}

function changeMessage() {
	let newMessage = messageHistory[currMessage];
	findReact(inputSelector, 3).memoizedProps.onValueUpdate(newMessage);
	inputSelector.value = newMessage;
}

function getJSON(url, callback) {
	let xhr = new XMLHttpRequest(); // a new request
	xhr.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			callback.apply(this, [JSON.parse(xhr.responseText)]);
		}
	};
	xhr.open("GET", url, true);
	xhr.send(null);
}

function updateCardInfo(name) {
	callUserApi(name, updateCardAge);
}

let updateCardAge = function (data) {
	let date = data.created_at;
	getNameHistory(data._id);
	let d = new Date(date);
	let n = new Date(Date.now());
	let age = dateDiff(n, d);
	let el = document.querySelector('.tu-channel-data-placeholder');
	let tvc = document.querySelector('.tu-viewer-card');
	el.parentNode.removeChild(el);
	tvc.insertAdjacentHTML('beforeend', components.viewerCard.age);
	document.querySelector('.viewer-card__profile-age').innerHTML = age;
	document.querySelector('.tu-created-on').innerHTML = 'Created on: ' + Intl.DateTimeFormat().format(d);
	document.querySelector('.viewer-card__followers').innerHTML = data.followers;
	document.querySelector('.viewer-card__views').innerHTML = data.views;
};

function dateDiff(a, b) {
	let diff = new Date(a.getTime() - b.getTime());
	let d = diff.getUTCDate() - 1;
	let y = diff.getUTCFullYear() - 1970;
	let m = diff.getUTCMonth() + y * 12;

	if (y > 1 && m % (y * 12) == 0) {
		return y + '.0 years';
	} else if (y > 1) {
		return (y + Math.round(((m - (y * 12)) / 12) * 10) / 10) + ' years';
	} else if (y == 1 && m == 12) {
		return '1.0 year';
	} else if (y == 1 && m < 24) {
		return (y + Math.round(((m - (y * 12)) / 12) * 10) / 10) + ' years';
	} else if (m > 1) {
		return m + ' months';
	} else if (m == 1) {
		return '1 month';
	} else if (d == 1) {
		return '1 day';
	} else if (d == 0) {
		return 'Today';
	} else {
		return d + ' days';
	}
}

function getNameHistory(id) {
	let url = 'https://twitch-tools.rootonline.de/username_changelogs_search.php?q=' + id + '&format=json';
	getJSON(url, updateNameHistory);
}

let updateNameHistory = function (data) {
	let hl = document.querySelector('.tu-name-history-list');
	hl.children[1].remove();
	if (data.length === 0) {
		let p = document.createElement('p');
		p.innerHTML = 'No name history.';
		p.setAttribute('class', 'tw-pd-l-1');
		hl.appendChild(p);
	} else {
		for (let i in data) {
			let p = document.createElement('p');
			p.innerHTML = data[i].username_old;
			p.setAttribute('class', 'tw-pd-l-1');
			hl.appendChild(p);
		}
	}
};

function callUserApi(name, callback) {
	let url = 'https://api.twitch.tv/kraken/channels/' + name + '?client_id=5ojgte4x1dp72yumoc8fp9xp44nhdj';
	let data = getJSON(url, callback);
	return data;
}

function toggleVisibility() {
	let toggle = document.querySelector('.' + this.getAttribute('data-toggle'));
	if (toggle.classList.contains('tw-hide')) {
		toggle.classList.remove('tw-hide');
	} else {
		toggle.classList.add('tw-hide');
	}
}

function addBlockedUser() {
	var newUser = prompt("Add a new user to the block list:").toLowerCase();
	if (newUser !== null) {
		blockedUsers.push(newUser);
		let addUser = '<div class="tw-mg-t-1"><button class="blocked-user-' + newUser + '">' + newUser + '</button></div>';
		blockedUsersList.insertAdjacentHTML('beforeend', addUser);
		document.querySelector('.blocked-user-' + newUser).onclick = removeBlockedUser;
		localStorage.twitchBlockList = blockedUsers;
		console.log('Added ' + newUser + ' to the block list.');
	}
}

function removeBlockedUser(event) {
	var removeID = event.target.innerHTML;
	var approved = confirm("Are you sure you wish to unblock " + removeID + "?");

	if (approved === true) {
		console.log('Unblocked ' + removeID + '!');
		blockedUsers.splice(blockedUsers.indexOf(removeID), 1);
		event.target.onclick = null;
		localStorage.twitchBlockList = blockedUsers;
		blockedUsersList.removeChild(event.target.parentElement);
	}
}

window.findReact = function (el, depth = 1) {
	for (const key in el) {
		if (key.startsWith('__reactInternalInstance$')) {
			let fiberNode = el[key];
			for (let i = 0; i < depth; i++) {
				fiberNode = fiberNode.return;
			}
			return fiberNode;
		}
	}
	return null;
};

window.findReactChat = function (el) {
	for (const key in el) {
		if (key.startsWith('__reactInternalInstance$')) {
			const fiberNode = el[key];
			return fiberNode.memoizedProps.children._owner.memoizedProps;
		}
	}
	return null;
};