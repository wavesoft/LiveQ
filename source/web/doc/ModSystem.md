
# Mod System for the LiveQ Engine

This documentation explains how the mod system of the LiveQ UI works. This document explains
the main components of the system and the API reference.

## Screen System

One of the core functionalities for the LiveQ User Interface is the screen system. This is the mechanism of presenting and transitioning through screens.

The management system and the registry of screens is located in the `core/screens` module.






## Module Types

LiveQ Modules break down to the following categories:

 * Visualization Components - Lightweight Javascript wrappers around DOM objects

### Histogram Visualization

Inputs:
 - Histogram data as `HistogramBuffer` class
 - Histogram reference data as `HistogramReference` class

## Interface

Screen types:

 - **Welcome**: Introduces the user to the interface
 - **Scoreboard**: Displays the scores of all the users in the game
 - **Home**: The screen from which the user picks a level
 - **Tuning**: The screen where the user changes the tunable parameters
 - **Machinery**: The screen where the user can check the status of his/her worker nodes
 - **Validation**: The screen where the user compares the final data with the experimenttal ones




### Tuning Screen

Functions:
 * `setTunableConfig([ Tunable ])` - Set the tune configuration
 * `setHistogramConfig([ HistogramMeta ])` - Set the histogram configuration
 * `setHistogramData([ HistogramData ])` - Set the (interpolated) histogram data

Events:
 * `requestEstimate({ })` - Request an estimate for parameter values
 * `start({ })` - Start the simulation

### Job Status Screen

Functions:
 * `setHistogramConfig([ HistogramMeta ])` - Set the histogram configuration
 * `setHistogramData([ ])` - Set the histogram data as they progressively arrive from the computing nodes
 * `setComputingData({ })` - Set metadata for the computing nodes
 * `setComputingNodeData({ })` - Details regarding a particular computing node

Events:
 * `abort` - Abort the current simuation
 * `computingDetails( computing_node )` - Request computing details for the specified node

