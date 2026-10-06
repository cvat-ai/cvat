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

## Phase 4: Benchmarking & Testing (2 Hour)
- Benchmark the endpoint using 5 repeated runs with cache disabled
- Record hardware specs, raw timing data, median, and spread into `docs/Objectives.md`
- Verify all acceptance points and check off items in `docs/Definition_of_Done.md` with concrete evidence.

# Wrap up (1 Hour)
- Record the loom video.

# 1 Hour for buffer
