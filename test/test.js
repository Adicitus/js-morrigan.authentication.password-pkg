const fs = require('fs')
const assert = require('assert')
const http = require('http')

const Morrigan = require('@adicitus/morrigan.server')


const dataDir = `${__dirname}/.data`

if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true })
}

describe("Morrigan.authentication.password Provider", async () => {
    var mongoDbServer = null
    var server = null
    const settings = {
        stateDir: `${dataDir}/state`, 

        http: {
            port: (Math.floor(Math.random() * 25536) + 40000)
        },

        logger: {
            console: true,
            level: 'silly',
            logDir: `${dataDir}/logs`
        },

        database: {
            connectionString: 'mongodb://127.0.0.1:27017', // Default value, will be overwritten in the 'before' clause
            dbname: "morrigan-server-test"
        },

        components: {
            auth: {
                module: '@adicitus/morrigan.components.authentication',
    
                providers: [
                    { name:'password', module: (require('../module.js')) }
                ]
            }
        }
    }

    const baseUrl = `http://localhost:${settings.http.port}/api`

    before(async() => {
        // Instantiation of a in-memory MOngoDB server to use for testing:
        const { MongoMemoryServer } = await import('mongodb-memory-server')
        mongoDbServer = await MongoMemoryServer.create()
        settings.database.connectionString = mongoDbServer.getUri()
        server = new Morrigan(settings)
        console.log('- Server STARTING '.padEnd(80, '-'))
        await server.start()
        console.log('- Server READY '.padEnd(80, '-'))
    })

    describe("Authenication", () => {
        it("Should be able to authenticate using default user 'admin'", (done) => {
            const url = `${baseUrl}/auth`

            let credentials = {
                type: 'password',
                name: 'admin',
                password: 'Pa55w.rd'
            }

            try {

                let req = http.request(url, { method: 'post', headers: { 'Content-Type': 'application/json' } }, (res) => {
                    res.setEncoding('utf8')
                    res.on('data', (dataRaw) => {
                        console.log(dataRaw)
                        assert.equal(res.statusCode, 200, `Expected status code 200, since we are using the default settings and transmitting default credentials to ${url} (got ${res.statusCode} instead)`)
                        assert(dataRaw)
                        assert.strictEqual(typeof dataRaw, 'string', `Expected stringified JSON to be returned by the server, found ${typeof dataRaw}`)
                        const data = JSON.parse(dataRaw)
                        assert.strictEqual(typeof data, 'object', `Expected a JSON object to be retruend by the server, found '${typeof data}'.`)
                        done()
                    })
                })

                req.on('error', (e) => {
                    console.error(e)
                })

                req.write(JSON.stringify(credentials))
                req.end()
            } catch (e) {
                console.error(e)
            }

        })
    })

    afterAll(async() => {
        await server.stop()
    })
})