const useMemory = (process.env.CACHE_DRIVER === 'memory') || (process.env.DISABLE_REDIS === 'true');

const serialize = (value) => {
  if (value === undefined) return 'null';
  return (typeof value === 'string' ? value : JSON.stringify(value));
};

if (useMemory) {
  const store = new Map();

  const now = () => Date.now();
  const getEntry = (key) => {
    const e = store.get(key);
    if (!e) return null;
    if (e.expiresAt && e.expiresAt <= now()) {
      store.delete(key);
      return null;
    }
    return e;
  };

  module.exports = {
    async get(key) {
      const e = getEntry(key);
      return e ? e.value : null;
    },
    async set(key, value, ttlSeconds = 3600) {
      const expiresAt = ttlSeconds ? now() + ttlSeconds * 1000 : 0;
      store.set(key, { value: serialize(value), expiresAt });
    },
    async del(key) {
      store.delete(key);
    },
    async eval() {
      return null;
    }
  };
} else {
  const redis = require('redis');

  const REDIS_URL = process.env.REDIS_URL;
  let client;
  if (REDIS_URL) {
    client = redis.createClient({ url: REDIS_URL });
  } else {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
    const username = process.env.REDIS_USERNAME || undefined;
    const password = process.env.REDIS_PASSWORD || undefined;

    client = redis.createClient({
      username,
      password,
      socket: { host, port }
    });
  }

  let redisConnected = false;

  client.on('error', (err) => {
    redisConnected = false;
    console.error('Redis Client Error', err);
  });

  client.on('connect', () => {
    redisConnected = true;
    console.log('Redis client connecting...');
  });

  client.on('ready', () => {
    redisConnected = true;
    console.log('Redis client ready');
  });

  client.connect().catch((err) => {
    redisConnected = false;
    console.error('Failed to connect to Redis at', REDIS_URL, err);
  });

  module.exports = {
    async get(key) {
      if (!redisConnected) return null;
      try {
        return await client.get(key);
      } catch (err) {
        console.error('Redis get error', err);
        return null;
      }
    },
    async set(key, value, ttlSeconds = 3600) {
      if (!redisConnected) return;
      try {
        await client.set(key, serialize(value), { EX: ttlSeconds });
      } catch (err) {
        console.error('Redis set error', err);
      }
    },
    async del(key) {
      if (!redisConnected) return;
      try {
        await client.del(key);
      } catch (err) {
        console.error('Redis del error', err);
      }
    },
    async eval(script, keys = [], args = []) {
      if (!redisConnected) return null;
      try {
        return await client.eval(script, { keys, arguments: args });
      } catch (err) {
        console.error('Redis eval error', err);
        return null;
      }
    }
  };
}
