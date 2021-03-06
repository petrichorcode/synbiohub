
var sha1 = require('sha1');

var config = require('../config')

const { getCollectionMemberCount, getCollectionMembers } = require('../query/collection')
const getGraphUriFromTopLevelUri = require('../getGraphUriFromTopLevelUri')

const uriToUrl = require('../uriToUrl')

function datatables(req, res) {

    if (req.query.type === 'collectionMembers') {

        collectionMembersDatatable(req, res)

    } else {

        res.status(404).send('???')

    }


}

module.exports = datatables

function collectionMembersDatatable(req, res) {

    const uri = req.query.collectionUri

    const graphUri = req.query.graphUri ? req.query.graphUri : config.get('triplestore').defaultGraph
    //const graphUri = getGraphUriFromTopLevelUri(uri, req.user)

    const offset = parseInt(req.query.start)
    const limit = parseInt(req.query.length)

    const sortParams = req.query.order !== undefined && req.query.order.length === 1 ? req.query.order[0] : {}

    if(sortParams) {
        sortParams.column = [
            'type',
            'displayId',
            'name',
            'description'
        ][parseInt(sortParams['column'])]
    }

    const search = req.query.search.value

    Promise.all([

        getCollectionMemberCount(uri, graphUri),
        getCollectionMemberCount(uri, graphUri, search),
        getCollectionMembers(uri, graphUri, limit, offset, sortParams, search)

    ]).then((result) => {

        const [count, filterCount, members] = result

        res.header('content-type', 'application/json').send(JSON.stringify({
            draw: parseInt(req.query.draw),
            recordsTotal: count,
            recordsFiltered: filterCount,
            data: members.map((member) => {

                var memberUrl = uriToUrl(member.uri)
                if (member.uri.toString().startsWith(config.get('databasePrefix'))) {
                    if (req.headers.referer.toString().endsWith('/share')) {
                        memberUrl += '/' + sha1('synbiohub_' + sha1(member.uri) + config.get('shareLinkSalt')) + '/share'
                    }
                }

                const typeLocalPart = member.type.slice(member.type.lastIndexOf('#') + 1)

                const memberName = member.name ? member.name : member.displayId

                if (member.description) {
                    member.description = member.description.length < 100 ? member.description : member.description.substring(0, 200) + '...'
                }

                return [
                    '<a href="' + member.type + '">' + typeLocalPart + '</a>',
                    '<a href="' + memberUrl + '">' + member.displayId + '</a>',
                    '<a href="' + memberUrl + '">' + memberName + '</a>',
                    member.description
                ]
            })
        }))

    }).catch((err) => {

        res.header('content-type', 'application/json').send(JSON.stringify({
            error: err.stack
        }))

    })
}



