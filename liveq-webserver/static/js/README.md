
LiveQ Client Library
==============================

This library provides the core functionality for contacting a LiveQ Entry Point, submitting and rendering histogram data from it.

Binary Protocol
===============

For optimizing the transfer rate of the histogram data, I am using typed arrays on javascript, streamed
through WebSocket. This allows direct transfer of the contents of the numpy buffer to the browser.

However, in order to use a single buffer for the entire operation, it must be aligned to 64-bits.

