# Implementation Plan

## Time Allocation (8 Hours Total)

## Phase 1: Setup and Understanding (1 Hours)
- Read through the assesment.
- understand the requirements.
- setup the environment.
- download the required files and folders.
- try to run all the files and folders in the environment.
- understand the existing codebase and its functionality.

## Phase 2: Backend Development (1 Hour)

- Explore the existing routes (end-points) in the codebase.
- Implement counting endpoint querying CVAT annotation tables directly via Django ORM


## Phase 3: Frontend Development (2 Hour)

- Create a dedicated React analytics page inside the CVAT web interface
- Fetch counts from the backend endpoint and render an interactive bar/pie chart
- Add navigation link in the CVAT sidebar to access the analytics page
- Implement state handling for:
     - Normal loaded state
     - Zero annotations / empty state
     - Failed network / unauthorized error state
- Implement a custom filter: Add an interactive dropdown to let users filter the graph by "Annotation Type" (Shapes vs. Tracks vs. Tags) to analyze manual vs. interpolated workloads.

## Phase 4: Benchmarking & Testing (2 Hour)
- Benchmark the endpoint using 5 repeated runs with cache disabled
- Record hardware specs, raw timing data, median, and spread into `docs/Objectives.md`
- Verify all acceptance points and check off items in `docs/Definition_of_Done.md` with concrete evidence.

# Wrap up (1 Hour)
- Record the loom video.

# 1 Hour for buffer


## Change of Plan
First planned to cover everything, but as I started the project got to know it is was more complex than i anticipated. BUT I have successfully implemented  7 of 10 the features that were required for the assessment.

However, due to time constraint I was not able to implement the following features:

- [ ] The graph updates live as annotations change, over WebSocket.
- [ ] The page recovers when the connection drops and comes back.

# Requirement 10 Decision Record
To be honest I didn't find any where to take a decision I used AI to write most of the code.

And that was also a decision in itself: USING AI for most of the code, BECAUSE I have not worked on this project before and I wanted to make sure that I was following the best practices and the code was up to date.

BUT what I made sure to read the document inside out, to understand what is required what is not required.

I implemented the feature which were most important and I left the features which were less important because of time contraint.
