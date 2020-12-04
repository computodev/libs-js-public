import Sdk from '../Sdk'

export const createSdk = ({identity = undefined} = {}) => {
    const sdk = new Sdk();
    identity && sdk.unmarshallIdentity(identity as any);
    return sdk;
};

export default createSdk;