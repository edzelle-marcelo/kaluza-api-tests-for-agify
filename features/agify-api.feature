Feature: Agify API Age Prediction

  Background:
    Given the API endpoint is "https://api.agify.io"

  # Pre-request validation scenarios
  Scenario: Valid pre-request for age prediction
    Given the query parameter "name" is set to "edzelle"
    When I prepare the request
    Then the request should be valid
    And the request should contain the query parameter "name"

  Scenario: Pre-request invalid when name is missing
    When I prepare the request
    Then the request should be invalid

  Scenario: Pre-request invalid when name is blank
    Given the query parameter "name" is set to ""
    When I prepare the request
    Then the request should be invalid

  Scenario: Pre-request invalid when name has unsupported characters
    Given the query parameter "name" is set to "m!ke123"
    When I prepare the request
    Then the request should be invalid

  # Post-response validation scenarios
  Scenario: Successful age prediction post-request validation
    Given the query parameter "name" is set to "edzelle"
    When I send the request
    Then the response status code should be 200
    And the response should have a JSON content type
    And the response body should contain the "name" property
    And the response body should contain the "age" property as number or null
    And the response body should contain the "count" property as number

  Scenario: Post-request validation for unknown name
    Given the query parameter "name" is set to "zzzzzzzz"
    When I send the request
    Then the response status code should be 200
    And the response body should contain the "name" property with value "zzzzzzzz"
    And the response body should contain the "age" property as number or null
    And the response body should contain the "count" property as number

  Scenario: Multi-name request returns list of predictions
    Given the query parameter "name[]" is set to "edzelle"
    And the query parameter "name[]" is set to "matthew"
    When I send the request
    Then the response status code should be 200
    And the response body should be an array with length 2
    And the first item should contain the "name" property
