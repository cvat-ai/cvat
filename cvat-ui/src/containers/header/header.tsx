import { connect } from 'react-redux';

import {
    SupportedPlugins,
    CombinedState,
} from 'reducers/interfaces';

import HeaderComponent from 'components/header/header';
import { logoutAsync } from 'actions/auth-actions';

interface StateToProps {
    logoutFetching: boolean;
    installedAnalytics: boolean;
    installedAutoAnnotation: boolean;
    installedTFSegmentation: boolean;
    installedTFAnnotation: boolean;
    username: string;
    serverAbout: any;
}

interface DispatchToProps {
    onLogout: typeof logoutAsync;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const { auth } = state;
    const { list } = state.plugins;
    const { about } = state;

    return {
        logoutFetching: state.auth.fetching,
        installedAnalytics: list[SupportedPlugins.ANALYTICS],
        installedAutoAnnotation: list[SupportedPlugins.AUTO_ANNOTATION],
        installedTFSegmentation: list[SupportedPlugins.TF_SEGMENTATION],
        installedTFAnnotation: list[SupportedPlugins.TF_ANNOTATION],
        username: auth.user.username,
        serverAbout: about.server,
    };
}

const mapDispatchToProps: DispatchToProps = {
    onLogout: logoutAsync,
};

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(HeaderComponent);
