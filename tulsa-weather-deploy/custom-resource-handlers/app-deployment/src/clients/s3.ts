import AWS from 'aws-sdk'

export class Bucket{
    
    name: string
    client: AWS.S3

    constructor(bucketName: string){
        this.name = bucketName;
        this.client = new AWS.S3();
    }

    async listObjectKeys(): Promise<(string|undefined)[]>{
        return this.client.listObjects({
            Bucket: this.name
        }).promise()
        .then(data => data.Contents ? data.Contents: [])
        .then(contents => contents.map(object => object.Key));
    }

    async deleteAllObjects() {
        console.log(`Deleting contents for bucket: ${this.name}`)
        return this.listObjectKeys().then(keys => 
            keys.forEach(key => {
                console.log(`Deleting object key: ${key}`)
                key && this.client.deleteObject({
                    Bucket: this.name,
                    Key: key
                }).promise()
            }));
    }
}