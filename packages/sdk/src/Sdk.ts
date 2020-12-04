import BaseSdk from './BaseSdk'

export class Sdk extends BaseSdk {
    async getCurrentOrganization() {
        return this.request({uri: `/organization`});
    }
    async getCurrentPlatform() {
        return this.request({uri: `/platform`});
    }
    async getJob(id: string) {
        return this.request({uri: `/jobs/${id}`});
    }
    async createJob(definition: any) {
        return this.request({method: 'POST', uri: '/jobs', body: {...definition}});
    }
}

export default Sdk
