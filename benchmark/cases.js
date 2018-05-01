const shadowsocks_presets = [
  // [stream ciphers]
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
    {"name": "ss-stream-cipher", "params": {"method": "rc4-md5"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "camellia-256-cfb"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "chacha20-ietf"}}
  ],
  // [aead ciphers]
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "chacha20-poly1305"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "chacha20-ietf-poly1305"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "xchacha20-ietf-poly1305"}}
  ]
];
const shadowsocks_obfs_presets = [
  [
    {"name": "ss-base"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "ss-base"},
    {"name": "obfs-random-padding"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "ss-base"},
    {"name": "obfs-random-padding"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ]
];

const shadowsocksr_presets = [
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-aes128-md5"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-aes128-sha1"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-chain-a"},
    {"name": "ss-stream-cipher", "params": {"method": "none"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-chain-b"},
    {"name": "ss-stream-cipher", "params": {"method": "none"}}
  ]
];
const shadowsocksr_obfs_presets = [
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-aes128-sha1"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "ss-base"},
    {"name": "ssr-auth-chain-a"},
    {"name": "ss-stream-cipher", "params": {"method": "none"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ]
];

const v2ray_presets = [
  [{"name": "v2ray-vmess", "params": {"id": "a3482e88-686a-4a58-8126-99c9df64b7bf", "security": "none"}}],
  [{"name": "v2ray-vmess", "params": {"id": "a3482e88-686a-4a58-8126-99c9df64b7bf", "security": "aes-128-gcm"}}],
  [{"name": "v2ray-vmess", "params": {"id": "a3482e88-686a-4a58-8126-99c9df64b7bf", "security": "chacha20-poly1305"}}]
];
const v2ray_obfs_presets = [
  [
    {"name": "v2ray-vmess", "params": {"id": "a3482e88-686a-4a58-8126-99c9df64b7bf", "security": "aes-128-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ]
];

const blinksocks_presets = [
  [
    {"name": "base-auth"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "base-auth"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  [
    {"name": "base-auth"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}}
  ]
];
const blinksocks_obfs_presets = [
  [
    {"name": "base-auth"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "base-auth"},
    {"name": "obfs-random-padding"},
    {"name": "ss-stream-cipher", "params": {"method": "aes-256-ctr"}}
  ],
  [
    {"name": "base-auth"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "base-auth"},
    {"name": "obfs-random-padding"},
    {"name": "ss-aead-cipher", "params": {"method": "aes-256-gcm"}}
  ],
  [
    {"name": "base-auth"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ],
  [
    {"name": "ss-base"},
    {"name": "aead-random-cipher", "params": {"method": "aes-256-gcm"}},
    {"name": "obfs-tls1.2-ticket", "params": {"sni": ["test.com"]}}
  ]
];

module.exports = [
  ...shadowsocks_presets,
  ...shadowsocks_obfs_presets,
  ...shadowsocksr_presets,
  ...shadowsocksr_obfs_presets,
  ...v2ray_presets,
  ...v2ray_obfs_presets,
  ...blinksocks_presets,
  ...blinksocks_obfs_presets
];
