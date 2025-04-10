import crypto from 'crypto';

/**
 * @typedef {Object} Customer_Address
 * @property {string} address1
 * @property {string} city
 * @property {string} country
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} phone
 * @property {string} province
 * @property {string} zip
 * @property {string} province_code
 * @property {string} country_code
 * @property {boolean} default
 */

/**
 * @typedef {Object} Customer_Data
 * @property {string} email
 * @property {string} [created_at]
 * @property {string} [first_name]
 * @property {string} [last_name]
 * @property {string} [tag_string]
 * @property {string} [identifier]
 * @property {string} [remote_ip]
 * @property {string} [return_to]
 * @property {CustomerAddress[]} [addresses]
 */

export class Multipass {
	encryptionKey;
	signatureKey;
	storeUrl;

	/**
	 * @param {string} multipassSecret
	 * @param {string} storeUrl
	 */
	constructor(multipassSecret, storeUrl) {
	    // Validate multipassSecret
	    if (typeof multipassSecret !== 'string' || !multipassSecret.trim().length) {
	        throw new Error('Invalid multipassSecret: Expected a non-empty string.');
	    }
	
	    // Validate storeUrl
	    if (typeof storeUrl !== 'string' || !storeUrl.trim().length) {
	        throw new Error('Invalid storeUrl: Expected a non-empty string.');
	    }
	
	    try {
	        // Ensure the URL is valid
	        this.storeUrl = new URL(storeUrl);
	    } catch (e) {
	        throw new Error('Invalid storeUrl: Must be a valid URL string.');
	    }
	
	    // Generate the SHA-256 hash of the multipassSecret
	    if (!crypto || typeof crypto.createHash !== 'function') {
	        throw new Error('Crypto module is unavailable or improperly configured.');
	    }
	
	    const hash = crypto.createHash('sha256').update(multipassSecret).digest();
	    if (hash.length !== 32) {
	        throw new Error('Unexpected hash length. Ensure SHA-256 is supported.');
	    }
	
	    // Split the hash into encryptionKey and signatureKey
	    this.encryptionKey = hash.slice(0, 16); // First 16 bytes
	    this.signatureKey = hash.slice(16, 32); // Next 16 bytes
	}

	/**
	 * Signs the given ciphertext using HMAC-SHA256.
	 * 
	 * @param {Buffer} ciphertext - The data to be signed (must be a Buffer).
	 * @returns {Buffer} - The resulting HMAC digest as a Buffer.
	 * @throws {TypeError} - If the input is not a Buffer.
	 */
	sign(ciphertext) {
	    // Validate that the input is a Buffer
	    if (!Buffer.isBuffer(ciphertext)) {
	        throw new TypeError("Expected 'ciphertext' to be a Buffer");
	    }
	
	    try {
	        // Create an HMAC instance with SHA256 and the provided signature key
	        const hmac = crypto.createHmac('SHA256', this.signatureKey);
	
	        // Update the HMAC with the ciphertext and compute the digest
	        return hmac.update(ciphertext).digest();
	    } catch (error) {
	        // Handle any unexpected errors during HMAC creation or update
	        console.error("An error occurred while signing:", error);
	        throw error; // Re-throw the error after logging
	    }
	}

	encrypt(customerData) {
	    try {
	        // Validate input to ensure it's an object
	        if (typeof customerData !== 'object' || customerData === null) {
	            throw new Error("Invalid input: customerData must be a non-null object");
	        }
	
	        // Generate a random IV
	        const iv = crypto.randomBytes(16);
	
	        // Create cipher instance
	        const cipher = crypto.createCipheriv('aes-128-cbc', this.encryptionKey, iv);
	
	        // Encrypt the data
	        return Buffer.concat([
	            iv,
	            cipher.update(JSON.stringify(customerData), 'utf8'),
	            cipher.final(),
	        ]);
	
	    
	    } catch (error) {
	        // Handle errors gracefully
	        console.error("Encryption failed:", error.message);
	        throw error; // Re-throw the error to notify the caller
	    }
	}

	generateToken(customerData) {
	    // Validate customerData to ensure it's an object
	    if (typeof customerData !== 'object' || customerData === null) {
	        throw new TypeError('customerData must be a non-null object');
	    }
	
	    // Ensure created_at exists and is properly set
	    if (!customerData.created_at) {
	        customerData.created_at = new Date().toISOString();
	    }
	
	    try {
	        // Encrypt the customer data
	        const ciphertext = this.encrypt(customerData);
	
	        // Sign the encrypted data
	        const signature = this.sign(ciphertext);
	
	        // Combine ciphertext and signature, then encode to Base64 URL-safe format
	        const buffer = Buffer.concat([ciphertext, signature]);
	        const token = buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	
	        return token;
	    } catch (error) {
	        // Handle errors in encryption or signing
	        console.error('Error during token generation:', error);
	        throw new Error('Token generation failed');
	    }
	}

	generateLoginUrl(customerData) {
	    // Validate customerData to ensure it is in the expected format
	    if (!customerData || typeof customerData !== 'object') {
	        throw new Error('Invalid customerData: Expected a non-empty object');
	    }
	
	    // Generate a secure token using generateToken
	    const token = this.generateToken(customerData);
	
	    if (!token || typeof token !== 'string') {
	        throw new Error('Invalid token generated: Expected a non-empty string');
	    }
	
	    // Construct the path dynamically
	    const path = `/account/login/multipass/${encodeURIComponent(token)}`;
	
	    try {
	        // Construct the full URL and return it as a string
	        return new URL(path, this.storeUrl).toString();
	    } catch (error) {
	        // Handle invalid storeUrl gracefully
	        throw new Error(`Failed to construct login URL: ${error.message}`);
	    }
	}
}