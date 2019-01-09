'use strict'

const test = require('tap').test
const path = require('path')
const tmp = require('tmp')
const cli = require('./cli.js')
const FakeUploadServer = require('./fake-upload-server.js')
let server
let server2
let tempCredentials

// JWT containing test@test.com
const successfulJwt = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1NDIyMjI5MzMsImV4cCI6MTg4OTM3ODEzMywiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoidGVzdCIsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSJ9.FO0v4OM2V23lAXIcv-qcfFo0snOrOmsrY82kmcYlrJI'
// JWT containing other@email.com
const successfulJwt2 = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1NDcwNDQwOTIsImV4cCI6MTg2MjY2MzI5MiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoiYmx1YiIsImVtYWlsIjoib3RoZXJAZW1haWwuY29tIn0.4OO5_5P3tEf-2Ggq9wmWWFGXM9p1NGmBnWX5bfCLVxE'

test('Before all', function (t) {
  t.plan(2)
  tempCredentials = tmp.dirSync()
  server = new FakeUploadServer()
  server.listen(function () {
    t.ok(server)
  })
  server2 = new FakeUploadServer()
  server2.listen(function () {
    t.ok(server2)
  })
})

test('clinic login', function (t) {
  cli({
    env: {
      CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-login'),
      CLINIC_JWT: successfulJwt
    }
  }, [
    'clinic', 'login',
    '--upload-url', server.uploadUrl
  ], function (err, stdout) {
    t.plan(2)
    t.ifError(err)

    t.strictDeepEqual(stdout.trim().split('\n'), [
      'Signed in as test@test.com.'
    ])
  })
})

test('clinic user exits with 1 if not authenticated', function (t) {
  cli({
    env: {
      CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user')
    }
  }, [
    'clinic', 'user'
  ], function (err, stdout) {
    t.plan(2)
    t.ok(err)
    t.ok(/exited with exit code 1/.test(err.message))
  })
})

test('clinic user lists all authed users', function (t) {
  t.plan(7)

  let after = 2

  cli({
    env: {
      CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user-all'),
      CLINIC_JWT: successfulJwt
    }
  }, [
    'clinic', 'login',
    '--upload-url', server.uploadUrl
  ], next)

  cli({
    env: {
      CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user-all'),
      CLINIC_JWT: successfulJwt2
    }
  }, [
    'clinic', 'login',
    '--upload-url', server2.uploadUrl
  ], next)

  function next (err) {
    t.ifError(err)
    after -= 1
    if (after > 0) return

    cli({
      env: {
        CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user-all')
      }
    }, [
      'clinic', 'user'
    ], function (err, stdout) {
      t.ifError(err)
      const userInfos = stdout.split('\n\n').sort((a, b) => {
        if (a.includes('test@test')) return -1
        if (a.includes('other@email')) return 1
        return 0
      })
      t.ok(userInfos[0].includes(server.uploadUrl))
      t.ok(userInfos[0].includes('Authenticated as test@test.com.'))
      t.ok(userInfos[1].includes(server2.uploadUrl))
      t.ok(userInfos[1].includes('Authenticated as other@email.com.'))
    })
  }
})

test('clinic user --upload-url lists single user', function (t) {
  t.plan(3)

  cli({
    env: {
      CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user-one'),
      CLINIC_JWT: successfulJwt
    }
  }, [
    'clinic', 'login',
    '--upload-url', server.uploadUrl
  ], function (err) {
    t.ifError(err)

    cli({
      env: {
        CLINIC_CREDENTIALS: path.join(tempCredentials.name, '.clinic-user-one')
      }
    }, [
      'clinic', 'user'
    ], function (err, stdout) {
      t.ifError(err)
      t.ok(stdout.includes('Authenticated as test@test.com.'))
    })
  })
})

test('After all', function (t) {
  t.plan(0)
  server.close()
  server2.close()
})