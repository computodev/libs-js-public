import fetch from 'node-fetch'
import jwt_decode from 'jwt-decode'

export abstract class BaseSdk {
    private identity: any|undefined;
    private readonly endpointPattern = 'https://api.{e.}lunii.com';
    private application;
    private readonly endpoint: string;
    constructor({env = 'prod', application = 'sdk'} = {}) {
        this.application = application;
        this.identity = undefined;
        this.endpoint = this.buildEndpoint(env);
    }
    getApplication() {
        return this.application;
    }
    buildEndpoint(env) {
        return this.endpointPattern.replace('{e.}', 'prod' === env ? '' : `${env}.`);
    }
    async request(req) {
        await this.ensureValidIdentity();
        return this.rawRequest(req);
    }
    async rawRequest(req, errorMessage: string|undefined = undefined) {
        const {authToken = undefined, uri = '/', method = 'GET', body = undefined, headers = {}} = req;
        const url = `${this.endpoint}${uri}`;
        return this.http({method, url, body, authToken: authToken || this.getAuthTokenIfExists(), headers, errorMessage});
    }
    async http({method, url, body, authToken, headers = {}, errorMessage}) {
        const options = {
            method,
            body: body ? ('string' !== typeof body ? JSON.stringify(body) : body) : undefined,
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Accept': 'application/json',
                ...(authToken ? {'Authorization': `Bearer ${authToken}`} : {}),
                ...headers,
            },
        };
        this.log('debug', 'http', url, options);
        const response = await fetch(url, options);
        if (!response.status || 200 > response.status || 600 <= response.status) {
            throw new Error(errorMessage || `Unable to retrieve data for request (#9)`);
        }
        switch (response.status) {
            case 503: throw new Error(`Remote Computo API not available (#10)`);
        }

        const payload = await response.json();
        if (!payload || !payload.response) {
            return {};
        }
        return payload.response;
    }
    getAuthTokenIfExists() {
        const identity = this.getIdentity();
        if (!identity) {
            return undefined;
        }
        if (!identity['accessToken']) return undefined;

        return identity['accessToken'];
    }
    getRefreshTokenIfExists() {
        const identity = this.getIdentity();

        if (!identity) return undefined;
        if (!identity['refreshToken']) return undefined;
        if (!identity['refreshToken']) return undefined;

        return identity['refreshToken'];
    }
    isLoggedIn() {
        return !!this.getCurrentUserId();
    }
    async ensureValidIdentity() {
        let authToken = this.getAuthTokenIfExists();
        if (!authToken) {
            if (this.isLoggedIn()) {
                await this.refreshAuthToken();
            } else {
                await this.loginAsAnonymous();
            }
            authToken = this.getAuthTokenIfExists();
            if (!authToken) {
                throw new Error(`Unable to login (no auth token)`);
            }
        }
        if (this.isExpiredToken(authToken)) {
            await this.refreshAuthToken();
        }
        return this;
    }
    async login({email, password}: {email: string, password: string}) {
        const data = await this.rawRequest({uri: '/auth-tokens', method: 'POST', body: {email, password, application: this.getApplication()}}, `Unable to login on LUNII Core API (#8)`);
        if (!data.accessToken) {
            throw new Error(`Unable to login on Computo API (#3)`);
        }
        return this.setIdentity({
            role: 'user',
            id: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
    }
    async getCurrentUser() {
        return this.request({uri: `/user`});
    }
    getCurrentUserId(): string|undefined {
        return (this.getIdentity() || {}).id;
    }
    async loginAsAnonymous() {
        return this.setIdentity({role: 'guest', id: undefined})
    }
    isExpiredToken(token: string, {delay} = {delay: 5}): boolean {
        const {exp} = (jwt_decode(token) || {}) as any;
        const currentTime = new Date().getTime() / 1000;
        return currentTime > (exp + delay);
    }
    marshallIdentity() {
        const identity = this.identity || {};
        return JSON.stringify({
            ...identity,
            accessToken: identity.accessToken,
            refreshToken: identity.refreshToken,
        });
    }
    unmarshallIdentity(string: string) {
        return this.setIdentity(JSON.parse(string));
    }
    getIdentity() {
        return this.identity;
    }
    async refreshAuthToken() {
        const data = await this.rawRequest(
            {
                authToken: this.getRefreshTokenIfExists(),
                uri: '/auth-tokens',
                method: 'POST',
                body: {refreshToken: this.getRefreshTokenIfExists(), application: this.getApplication()},
            },
            `Unable to refresh tokens on Computo API (#4)`
        )
        if (!data.accessToken) {
            throw new Error(`Unable to refresh token on Computo API (#6)`);
        }
        return this.setIdentity({
            role: 'user',
            id: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
        });
    }
    setIdentity({role, id = undefined, accessToken = undefined, refreshToken = undefined}) {
        this.identity = {role, id, accessToken, refreshToken};
        return this;
    }
    log(level: string, ...args) {
        !!process.env.COMPUTO_SDK_DEBUG && console.log(`[computo-sdk] ${level.toUpperCase()} ${args.map(x => JSON.stringify(x)).join(' ')}`);
    }
}

export default BaseSdk

