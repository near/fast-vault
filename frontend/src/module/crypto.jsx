// Uint8Array -> Array
const array2buf = (array) => Array.from(array);

// Uint8Array -> str
const arr2str = (array) => {
  var result = "";
  for (var i = 0; i < array.length; i++) {
    result += String.fromCharCode(array[i]);
  }
  return result;
};

// str -> Uint8Array
const str2array = (str) => {
  return new Uint8Array(Array.from(str).map((letter) => letter.charCodeAt(0)));
};

// accountId: str, password: str
const newSecretKey = (accountId, password) => {
  const hashed_id = nacl.hash(str2array(accountId));
  const hashed_pw = nacl.hash(str2array(password));
  const sk = new Uint8Array(nacl.secretbox.keyLength);
  for (var i = 0; i < hashed_id.length; i++) {
    const sk_i = i % sk.length;
    if (i >= sk.length) {
      sk[sk_i] = sk[sk_i] + (hashed_id[i] + hashed_pw[i]);
    } else {
      sk[sk_i] = hashed_id[i] + hashed_pw[i];
    }
  }
  return sk;
};

const newNonce = (message) => {
  const hash = nacl.hash(message);
  const nonce = new Uint8Array(nacl.secretbox.nonceLength);
  for (var i = 0; i < hash.length; i++) {
    const n_i = i % nonce.length;
    if (i >= nonce.length) {
      nonce[n_i] += hash[i];
    } else {
      nonce[n_i] = i & hash[i];
    }
  }
  return nonce;
};

// message: Uint8Array
const encrypt = (message, storageSk) => {
  const nonce = newNonce(message);
  const ciphertext = nacl.secretbox(message, nonce, storageSk);
  return {
    nonce: Array.from(nonce),
    ciphertext: Array.from(ciphertext),
  };
};

// message: str
const encryptStr = (text, storageSk) => {
  return encrypt(str2array(text), storageSk);
};

// message: JS Object
const encryptObject = (obj, storageSk) => {
  return encrypt(str2array(JSON.stringify(obj)), storageSk);
};

// nonce: Uint8Array
// ciphertext: Uint8Array
// storageSk: Uint8Array
const decrypt = (nonce, ciphertext, storageSk) => {
  return nacl.secretbox.open(ciphertext, nonce, storageSk);
};

// message: JS Object
const decryptObject = (nonce, ciphertext, storageSk) => {
  return JSON.parse(arr2str(decrypt(nonce, ciphertext, storageSk)));
};

return {
  encrypt,
  encryptStr,
  encryptObject,
  decrypt,
  decryptObject,
  newSecretKey,
};
