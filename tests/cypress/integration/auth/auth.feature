Feature: Check server availability

    Background: Server web interface is available
        Given Server web interface is available


    @JIRA_TASKNAME @Autotest
    Scenario: Login
        Then "/auth/login" contains in the URL
        Then Check "Sign in" button
        And Check "Create an account" button
        And Check "Forgot password?" button
        And Check placeholder "Email or username"
        When Enter value in field "credential"
        Then Check placeholder "Password"
        And Clear field "credential"
        When Log in
        Then "tasks?page=1" contains in the URL

