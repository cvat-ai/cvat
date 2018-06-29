/* exported TrackFilterModel TrackFilterController TrackFilterView */
"use strict";

class TrackFilterModel {
    constructor(labelsInfo) {
        this._query = '//*';
        this._labels = labelsInfo.labels();
        this._attributes = labelsInfo.attributes();
        this._hideFiltered = true;
    }


    _convertTrack(track) {
        return {
            id: track.trackModel.id,
            type: track.trackModel.trackType,
            lock: track.trackModel.lock,
            occluded: track.interpolation.position.occluded ? true : false,
            attr: fillAttr(track.interpolation.attributes),
        };

        function fillAttr(attributes) {
            let attr = {};
            for (let attrId in attributes) {
                let name = attributes[attrId].name.toLowerCase();
                let value = attributes[attrId].value;
                attr[name] = typeof(value) == 'string' ? value.toLowerCase() : value;
            }
            return attr;
        }
    }


    filter(collection) {
        let convertedCollection = {};
        let filteredData = [];

        for (let track of collection) {
            let convertedTrack = this._convertTrack(track);
            filteredData.push(track.trackModel.id);
            let label = this._labels[track.trackModel.label];
            if (!(label in convertedCollection)) {
                convertedCollection[label] = [];
            }
            convertedCollection[label].push(convertedTrack);
        }

        let query = '(' + this._query + ')/id';
        try {
            filteredData = JSON.search(convertedCollection, query);
        }
        catch(error) {
            return filteredData;
        }

        if (this._hideFiltered) {
            for (let idx = 0; idx < collection.length; idx ++) {
                if (!filteredData.includes(collection[idx].trackModel.id)) {
                    collection.splice(idx, 1);
                    idx --;
                }
            }
        }

        return filteredData;
    }


    updateQuery(newQuery) {
        let correctFilter = true;
        if (newQuery === '') this._query = '//*';
        else {
            try {
                document.evaluate(newQuery, document);
                this._query = newQuery;
            }
            catch (error) {
                this._query = '//*';
                correctFilter = false;
            }
        }

        if (this._hideFiltered) {
            if (this._updateCollection) {
                this._updateCollection();
            }
        }

        return correctFilter;
    }

    get hideFiltered() {
        return this._hideFiltered;
    }

    set hideFiltered(value) {
        if (value != true && value != false) {
            throw new Error('Bad merge value');
        }
        this._hideFiltered = value;
        if (this._updateCollection) {
            this._updateCollection();
        }
    }
}


class TrackFilterController {
    constructor(filterModel) {
        this._model = filterModel;
        setupFilterShortkeys();

        function setupFilterShortkeys() {
            let hideFilteredTracksHandler = Logger.shortkeyLogDecorator(function() {
                $('#hideFilteredBox').click();
            });

            let shortkeys = userConfig.shortkeys;
            Mousetrap.bind(shortkeys["hide_filtered_tracks"].value, hideFilteredTracksHandler, 'keydown');
        }
    }

    updateQuery(newQuery) {
        return this._model.updateQuery(newQuery);
    }

    hideFiltered(value) {
        this._model.hideFiltered = value;
    }
}


class TrackFilterView {
    constructor(filterModel, filterController) {
        this._controller = filterController;
        this._filterString = $('#filterInputString');
        this._resetFilterButton = $('#resetFilterButton');
        this._hideFilteredBox = $('#hideFilteredBox');

        this._hideFilteredBox.prop('checked', filterModel.hideFiltered);

        this._filterString.on('keypress keydown keyup', function(e) {
            e.stopPropagation();
        });
        this._filterString.attr("placeholder", 'Example: //car[attr/model="mazda"]');

        this._filterString.on('change', function(e) {
            let query = e.target.value;
            if (this._controller.updateQuery(query)) {
                this._filterString.css('color', 'green');
            }
            else {
                this._filterString.css('color', 'red');
            }
        }.bind(this));

        this._resetFilterButton.on('click', function() {
            this._filterString.prop('value', '');
            this._controller.updateQuery('');
        }.bind(this));

        this._hideFilteredBox.on('change', function(e) {
            let value = e.target.checked;
            this._controller.hideFiltered(value);
        }.bind(this));
    }
}
