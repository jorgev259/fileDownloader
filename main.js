
const puppeteer = require('puppeteer')
const cheerio = require('cheerio')
const request = require('request')
const fs = require('fs')
const path = require('path')

/* configuration */
const baseUrl = 'http://ruuuuu.blog.jp'
const filterInclude = 'livedoor.blogimg.jp'
const filterExclude = '-s.'
const savePath = 'disk/'
const timeout = 30000
const urls = [baseUrl]
const images = []

puppeteer
  .launch({args:['--no-sandbox']})
  .then(async function (browser) {
    const pageBase = await browser.newPage()
    await pageBase.goto(baseUrl,{timeout:timeout})
    const html = await pageBase.content()
    var $ = cheerio.load(html)

    $('[href]').each(function () {
      let url = $(this).attr('href')
      if (url.includes('/archives/') || url.includes('?p=')) {
        if (url.startsWith('/')) url = baseUrl + url
        if (!urls.includes(url)) urls.push(url)
      }
    })
    pageBase.close()
    getImages(browser, urls)

    /*
        const promises = []
    $('img').each(function () {
      const url = $(this).attr('src')

      if (url.includes(filterInclude) && !url.includes(filterExclude)) {
        const pathSplit = url.split('/')
        promises.push(download(url, `disk/${pathSplit[pathSplit.length - 1]}`))
      }

    })
        Promise.all(promises).then(result => console.log(result)).catch(err => console.log(err))
    */
  })
  .catch(function (err) {
    // handle error
    console.log(err)
  })

function getImages (browser, urls) {
  console.log(urls)
  browser.newPage().then(page => runPage(urls, page))
}

function runPage (urls, page) {
  if (urls.length === 0) return runDownload()
  const url = urls.pop()

  console.log(`${url}. Remaining URLs: ${urls.length}. Found images: ${images.length}`)
  page.goto(url,{timeout:timeout}).then(() => {
    page.content().then(html => {
      var $ = cheerio.load(html)

      $('img').each(function () {
        const url = $(this).attr('src')

        if (url.includes(filterInclude) && !url.includes(filterExclude) && !images.includes(url)) {
          images.push(url)
        }
      })

      runPage(urls, page)
    })
  })
}

function runDownload () {
  console.log('Starting download.')
  allSkippingErrors(images.map(img => {
    const pathSplit = img.split('/')
    return download(img, path.join(savePath, `disk/${pathSplit[pathSplit.length - 1]}`))
  })).then(() => {
    console.log('Process Finished.')
    process.exit()
  })
}

function download (uri, filename) {
  return new Promise((resolve, reject) => {
    request.head(uri, function (err, res, body) {
      if (err) reject(err)
      // console.log('content-type:', res.headers['content-type'])
      // console.log('content-length:', res.headers['content-length'])
      console.log(`Downloading ${uri}`)

      request(uri).pipe(fs.createWriteStream(filename)).on('close', resolve)
    })
  })
}

function allSkippingErrors (promises) {
  return Promise.all(
    promises.map(p => p.catch(error => console.log(error)))
  )
}
