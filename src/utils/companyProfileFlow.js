export function shouldShowCompanyProfileSetup({ user, companyProfileSetupOpen, landingView }) {
    if (!user) {
        return false;
    }

    return Boolean(companyProfileSetupOpen || landingView === 'profile');
}
