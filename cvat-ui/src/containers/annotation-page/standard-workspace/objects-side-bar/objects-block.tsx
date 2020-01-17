import React from 'react';
import { connect } from 'react-redux';

import ObjectsBlockComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-block';

interface StateToProps {

}

interface DispatchToProps {

}

function mapStateToProps(): StateToProps {
    return {};
}

function mapDispatchToProps(): DispatchToProps {
    return {};
}

function AppearanceSettingsContainer(props: StateToProps & DispatchToProps): JSX.Element {
    return (
        <ObjectsBlockComponent {...props} />
    );
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(AppearanceSettingsContainer);
