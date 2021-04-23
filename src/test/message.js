require('dotenv').config()
const app = require('../server.js')
const mongoose = require('mongoose')
const chai = require('chai')
const chaiHttp = require('chai-http')
const assert = chai.assert

const User = require('../models/user.js')
const Message = require('../models/message.js')

chai.config.includeStack = true

const expect = chai.expect
const should = chai.should()
chai.use(chaiHttp)

/**
 * root level hooks
 */
after((done) => {
  // required because https://github.com/Automattic/mongoose/issues/1251#issuecomment-65793092
  mongoose.models = {}
  mongoose.modelSchemas = {}
  mongoose.connection.close()
  done()
})

const SAMPLE_OBJECT_ID = 'aaaaaaaaaaaa' // 12 byte string

describe('Message API endpoints', () => {

  beforeEach((done) => {
    const sampleUser = new User({
      username: 'myuser',
      password: 'mypassword',
      _id: SAMPLE_OBJECT_ID
    })

    const sampleMessage = new Message({
      title: 'my title',
      body: 'my body',
      author: sampleUser._id,
      _id: SAMPLE_OBJECT_ID
    })

    sampleUser.save()
    sampleMessage.save()

    done()
  })

  afterEach((done) => {
    Message.deleteMany({ title: ['my title', 'new msg title', 'another title'] })
      .then(() => {

        User.deleteMany({ username: ['myuser'] })
          .then(() => {
            done()
          }).catch((err) => {
            done(err)
          })

      }).catch((err) => {
        done(err)
      })
  })

  it('should load all messages', (done) => {
    chai.request(app)
      .get('/messages')
      .end((err, res) => {
        if (err) { done(err) }
        expect(res).to.have.status(200)
        expect(res.body.messages).to.be.an("array")

        done()
      })
  })

  it('should get one specific message', (done) => {
    chai.request(app)
      .get(`/messages/${SAMPLE_OBJECT_ID}`)
      .end((err, res) => {
        if (err) { done(err) }
        expect(res).to.have.status(200)
        expect(res.body).to.be.an('object')
        expect(res.body.title).to.equal('my title')
        expect(res.body.body).to.equal('my body')
        done()
      })
  })

  it('should post a new message', (done) => {
    chai.request(app)
      .post('/messages')
      .send({ title: 'new msg title', body: 'new msg body', author: SAMPLE_OBJECT_ID })
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body).to.be.an('object')
        expect(res.body).to.have.property('title', 'new msg title')
        expect(res.body).to.have.property('body', 'new msg body')

        // check that message is actually inserted into database
        Message.findOne({ title: 'new msg title' }).then(message => {
          expect(message).to.be.an('object')
          done()
        }).catch((err) => {
          done(err)
        })
      })
  })

  it('should update a message', (done) => {
    chai.request(app)
      .put(`/messages/${SAMPLE_OBJECT_ID}`)
      .send({ title: 'another title' })
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body.message).to.be.an('object')
        expect(res.body.message).to.have.property('title', 'another title')

        // check that a message is actually inserted into database
        Message.findOne({ title: 'another title' }).then(message => {
          expect(message).to.be.an('object')
          done()
        }).catch((err) => {
          done(err)
        })
      })
  })

  it('should delete a message', (done) => {
    chai.request(app)
      .delete(`/messages/${SAMPLE_OBJECT_ID}`)
      .end((err, res) => {
        if (err) { done(err) }
        expect(res.body.message).to.equal('Successfully deleted.')
        expect(res.body._id).to.equal(SAMPLE_OBJECT_ID)

        // check that user is actually deleted from database
        Message.findOne({ title: 'my title' }).then(message => {
          expect(message).to.equal(null)
          done()
        }).catch((err) => {
          done(err)
        })
      })
  })
})
