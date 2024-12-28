import { Action, TextMessage } from './exports';
import * as browser from './browser';

browser.runtime.onMessage.addListener((message, sender, _): undefined => {
    // console.log(message, sender);
    const msg = message as TextMessage;
    switch (msg.action) {
        case Action.SetBadge:
            if (sender.tab && sender.tab.id) {
                browser.action.setBadgeBackgroundColor({color: 'black'});
                browser.action.setBadgeText({text: msg.text, tabId: sender.tab.id});
            }
            break;
    }
});
