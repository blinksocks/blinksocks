module.exports = [
  // +-------------------------+
  // |      SINGLE PRESET      |
  // +-------------------------+

  // ss-base
  [{"name": "ss-base"}],
  // exp-base-with-padding
  [{"name": "exp-base-with-padding", "params": {"salt": "any string"}}],
  // exp-base-auth-stream
  [{"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}}],

  // +-------------------------+
  // |       TWO PRESETS       |
  // +-------------------------+

  // [shadowsocks stream ciphers]
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-cfb"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "camellia-256-cfb"}}
  ],
  // [shadowsocks aead ciphers]
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}}
  ],
  // ss-base + aead-random-cipher
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}}
  ],
  // ss-base + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + ss-stream-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  // exp-base-with-padding + ss-aead-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}}
  ],
  // exp-base-with-padding + aead-random-cipher
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}}
  ],
  // exp-base-with-padding + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-auth-stream + obfs-tls1.2-ticket
  [
    {"name": "exp-base-auth-stream", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],

  // +-------------------------+
  // |      THREE PRESETS      |
  // +-------------------------+

  // ss-base + ss-stream-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // ss-base + ss-aead-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // ss-base + aead-random-cipher + obfs-tls1.2-ticket
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + ss-stream-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + ss-aead-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm", "info": "ss-subkey"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  // exp-base-with-padding + aead-random-cipher + obfs-tls1.2-ticket
  [
    {"name": "exp-base-with-padding", "params": {"salt": "any string"}},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm", "info": "bs-subkey", "factor": 2}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
];
