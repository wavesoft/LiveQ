
## Database Scheme

The following sections store the JSON schema that should be followed for the couchDB database of the project.

# Observables

Database name: `observables`

Contains information regarding the observables (Rivet histograms) in the tuning system.

    {
          _id: 'obs-01', // Index (ex. /ALEPH_1996_S3486095/d03-x01-y01)
         type: 'h2',     // One of: h1 (Histo 1D), h2 (Histo 2D), 
         meta: {         // Metadata for the histogram (dependant per type)
            ...
         }
         info: {         // Information for the user:
           name: '...',  //   The visible name for this parameter
          short: 'N01',  //   A short (iconic) name for this parameter
           book: 'r-01', //   Reference ID for providing more explaination 
         },
         corr: {         // Correlation information
            obs: [       // Correlation to other objservables 
               {
                  id: '.',    // The objservable ID
                   w: 1,      // The correlation weight between 0 (unimportant) and 3 (most important)
                info: {       // The same as the previous 'info' entry
                    ...
                   },
                auto: {       // Automation information (not used yet)
                    ...
                   }
               }
            ],
            tun: [ .. ]   // Correlation to tunables (same as above)
         }
    }

# Tunables

Dabase name: `tunables`

Contains information regarding the tunables in the tuning system.

    {
          _id: 'num-01', // The tunable id (ex. TimeShower:alphaSvalue)
         type: 'num',    // One of: num,str,list,bool
          def: 0,        // The default value for this element
         value: {        // Value metadata, for 'num' type:
            min: 0,      //   The minimum value
            max: 10,     //   The maximum value
            dec: 2       //   The decimals on the number
         },
         info: {         // Information for the user:
           name: '...',  //   The visible name for this parameter
          short: 'N01',  //   A short (iconic) name for this parameter
           book: 'r-01', //   Reference ID for providing more explaination 
          group: '...'   //   The group name where this parameter belongs
         },
         corr: {         // Correlation information
            obs: [       // Correlation to objservables 
               {
                  id: '.',    // The objservable ID
                   w: 1,      // The correlation weight between 0 (unimportant) and 3 (most important)
                info: {       // The same as the previous 'info' entry
                    ...
                   },
                auto: {       // Automation information (not used yet)
                    ...
                   }
               }
            ],
            tun: [ .. ]   // Correlation to other tunables (same as above)
         }
    }

# Tutorials

Databse name: `tutorials`

This database contains the tutorials (tv-head videos) that can be used throughout the project.

    {
       "_id": "pub.welcome",    // The indexing key
       "info": {
           "title": ".."        // Tutorial title
       },
       "sequence": {
           "video": "http://",  // Link to youtube video,
           "aids": [            // Visual aids to focus
               {
                   "at": 2,         // Position in seconds
                   "duration": 3,   // Duration in seconds
                   "focus": "..."   // The aid ID (defined by R.registerVisualAid() )
               },
               ...
            ]           
       }
    }


# Books

Database name: `books`

This database contains reference information for the user. Each book contains a short description of any particular topic, followed by a set of games-in-game and external resources. They are usually rendered either on a cursor pop-up window or on a full-screen display.

    {
        "_id": "..",            // The book indexing key
        "info": {
            "title": "...",     // The book title
            "desc": "",         // The short description of the book topic
        },
        "games": [              // List of games-in-game for this book
            {
                "title": "..",  // The game title
                "icon": "..",   // The game icon
                "color": "..",  // The color of the game tile
                "url": ".."     // The URL for the game to display
            }
        ],
        "material": [           // List of external resources
            {
                "title": "..",  // The material title
                "icon": "..",   // The material icon
                "color": "..",  // The color of the material tile
                "url": ".."     // The URL for the material
            }
        ]
    }

# Topics Map

Database name `topic_map`

This database contains the linked-list information for building the topics tree on the home page

    {
        "_id": "..",            // A unique ID for this topic
        "parent": "..",         // The parent topic ID or null for the root topic
        "info": {
            "title": "...",     // The topic title
            "subtitle": "..",   // A short text for the topic, listed below the header
            "icon": "...",      // The icon to place on the topic tile
            "color": "..",      // The color scheme to use for this topic tile
            "book": ".."        // The book ID
        },
        "tasks": [              // A list of task IDs that belong in this topic
            "...", ...
        ]
    }

# Taks List

Database name `tasks`

This database contains the list of tasks the user can run. They are refered from the topics_map database.

    {
        "_id": "..",            // The unique ID for this task
        "lab": "...",           // The LiveQ lab ID related to this task
        "info": {
            "title": "..",      // The title of this task
            "subtitle": "..",   // The subtitle for this task
            "desc": "",         // A long description for this task
            "animation": "",    // The related canvas animation for this project
            "book": "...",      // The related book for this task
            "tutorial": ".."    // The tutorial ID to display when the user enters the level
        },
        "validate": {           // Validation configuration
          "accept": 1,          // The minimum acceptable chi-square value
          "perfect": 0.2,       // The perfect chi-square value
        },
        "tunables": [           // The list of tunable IDs to display to the user
            "..", ...
        ],
        "observables": [        // The list of observble IDs to display to the user
            "..", ...
        ],
    }
