/* eslint-disable class-methods-use-this */
import { createClass } from 'asteroid';
import { eventChannel } from 'redux-saga';

const Asteroid = createClass();

export default class Connection {
  constructor(options) {
    if (typeof options.endpoint !== 'string') throw new Error('Please pass an endpoint to Asteroid.');
    this.options = options;
    this.client = null;
  }

  start() {
    this.client = new Asteroid({
      autoConnect: false,
      autoReconnect: false,
      maintainCollections: true,
      ddpVersion: '1',
      endpoint: this.options.endpoint,
    });
  }

  connect() {
    this.client.ddp.connect();
  }

  connectedEventChannel() {
    return eventChannel(listener => {
      const connected = this.client.ddp.on('connected', () => {
        listener('connected');
      });
      return () => {
        this.client.ddp.removeListener('connected', connected);
      };
    });
  }

  disconnectedEventChannel() {
    return eventChannel(listener => {
      const disconnected = this.client.ddp.on('disconnected', () => {
        listener('disconnected');
      });
      return () => {
        this.client.ddp.removeListener('disconnected', disconnected);
      };
    });
  }

  call(...params) {
    return new Promise((resolve, reject) => {
      this.client.call(...params)
      .then(result => {
        if (typeof result === 'object' && result.errorType === 'Meteor.Error') {
          reject(result);
        } else {
          resolve(result);
        }
      })
      .catch(error => reject(error));
    });
  }

  loginWithPassword(email, password) {
    return this.client.loginWithPassword({ email, password });
  }

  loggedInEventChannel() {
    return eventChannel(listener => {
      const loggedIn = this.client.on('loggedIn', () => {
        listener(this.client.userId);
      });
      return () => {
        this.client.removeListener('loggedIn', loggedIn);
      };
    });
  }

  loggedOutEventChannel() {
    return eventChannel(listener => {
      const loggedOut = this.client.on('loggedOut', () => {
        listener('logout');
      });
      return () => {
        this.client.removeListener('loggedOut', loggedOut);
      };
    });
  }

  logout() {
    return this.client.logout();
  }

  subscribe(...params) {
    return this.client.subscribe(...params);
  }

  unsubscribe(id) {
    this.client.unsubscribe(id);
  }

  collectionEventChannel(selectedCollection) {
    return eventChannel(listener => {
      const added = this.client.ddp.on('added', ({ collection, id, fields }) => {
        if (collection === selectedCollection) {
          listener({ collection: selectedCollection, event: 'added', id, fields });
        }
      });
      const changed = this.client.ddp.on('changed', ({ collection, id, fields }) => {
        if (collection === selectedCollection) {
          listener({ collection: selectedCollection, event: 'changed', id, fields });
        }
      });
      const removed = this.client.ddp.on('removed', ({ collection, id, fields }) => {
        if (collection === selectedCollection) {
          listener({ collection: selectedCollection, event: 'removed', id, fields });
        }
      });
      return () => {
        this.client.ddp.removeListener('added', added);
        this.client.ddp.removeListener('changed', changed);
        this.client.ddp.removeListener('removed', removed);
      };
    });
  }

  readyEventChannel(subscription) {
    return eventChannel(listener => {
      const ready = subscription.on('ready', () => {
        listener({ subscription: subscription.name });
      });
      return () => {
        subscription.removeListener('ready', ready);
      };
    });
  }

  errorEventChannel(subscription) {
    return eventChannel(listener => {
      const error = subscription.on('error', err => {
        listener({ subscription: subscription.name, error: err });
      });
      return () => {
        subscription.removeListener('error', error);
      };
    });
  }
}
