-- Events sent from a developer's device (localhost or ?test=1). The queries leave them out.
ALTER TABLE events ADD COLUMN test INTEGER NOT NULL DEFAULT 0;
