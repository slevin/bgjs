import {DevtoolConnection} from "./devtool";
import {DevtoolClientConnection} from "./devtool-client";
import {Message} from "./messages.js";

export class LocalConnection implements DevtoolConnection, DevtoolClientConnection {
    clientListener: ((arg0: Message) => void)|null = null;
    listener: ((arg0: Message) => void)|null = null;

    send(message: Message) {
        this.clientListener?.(message);
    }

    listen(listener: (message: Message) => void) {
        this.listener = listener;
    }

    clientSend(message: Message) {
        this.listener?.(message);
    }

    clientListen(listener: (message: Message) => void) {
        this.clientListener = listener;
    }
}