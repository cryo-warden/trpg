# Style Guidelines

1. Construct complete, valid instances
   - Valid-on-creation instances reduce bugs and makes code more readable.
   - Avoid mutating fields after construction. The same instance will then have consistent behavior in every place it exists.
   - If multi-step construction is required, provide a validated builder that produces the final value.
