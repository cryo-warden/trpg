//! A macro to reduce boilerplate code in Rust.
//!
//! Sometimes you can't DRY code with the type system alone.
//! Different types may require code of the exact same form, but
//! with different symbols. Generics can help, but not always.
//!
//! This crate provides a way to substitute symbols into statements,
//! arguments, fields, and even attributes. You can specify multiple
//! sets of symbols to substitute, and the target code will be
//! duplicated for each symbol.
//!
//! # Example
//! ```rust
//! use secador::secador;
//!
//! # struct SomeContainer;
//! # impl SomeContainer {
//! #     fn some_method(&self) -> Vec<i32> { vec![1, 2, 3] }
//! #     fn another_method(&self) -> Vec<i32> { vec![4, 5, 6] }
//! # }
//! # let some_container = SomeContainer;
//! #
//! secador!((variable_iter), [(some_method), (another_method)], {
//!     seca!(1);
//!     for x in some_container.__variable_iter().iter() {
//!         println!("{:?}", x);
//!     }
//! });
//! ```
//! This expands to:
//! ```rust
//! # struct SomeContainer;
//! # impl SomeContainer {
//! #     fn some_method(&self) -> Vec<i32> { vec![1, 2, 3] }
//! #     fn another_method(&self) -> Vec<i32> { vec![4, 5, 6] }
//! # }
//! # let some_container = SomeContainer;
//! #
//! for x in some_container.some_method().iter() {
//!     println!("{:?}", x);
//! }
//! for x in some_container.another_method().iter() {
//!     println!("{:?}", x);
//! }
//! ```

mod tests;

/// A macro to reduce boilerplate code in Rust.
/// Takes a tuple of names, a list of substition tuples, and a block of code.
/// The block of code is duplicated for each substitution tuple, with each
/// name replaced by the corresponding value in the tuple.
/// # Example
/// ```rust
/// use secador::secador;
///
/// # struct SomeContainer;
/// # impl SomeContainer {
/// #     fn some_method(&self) -> Vec<i32> { vec![1, 2, 3] }
/// #     fn another_method(&self) -> Vec<i32> { vec![4, 5, 6] }
/// # }
/// # let some_container = SomeContainer;
/// #
/// secador!((variable_iter), [(some_method), (another_method)], {
///     seca!(1);
///     for x in some_container.__variable_iter().iter() {
///         println!("{:?}", x);
///     }
/// });
/// ```
pub use secador_macro::secador;

/// Like `secador!`, but allows multiple sets of names and substitution tuples.
/// The substition sets can lead to polynomial code expansion, so use with care.
///
/// # Example
/// ```rust
/// use secador::secador_multi;
///
/// # struct SomeContainer;
/// # impl SomeContainer {
/// #     fn some_method(&self) -> Vec<i32> { vec![1, 2, 3] }
/// #     fn another_method(&self) -> Vec<i32> { vec![4, 5, 6] }
/// # }
/// # let some_container = SomeContainer;
/// #
/// secador_multi!(
///   seca_iter!((variable_iter), [(some_method), (another_method)]),
///   seca_attr!((attribute), [(derive(Debug)), (derive(Clone))]),
///   {
///     #[seca_attr(1)]
///     #[__attribute]
///     pub struct SomeStruct(pub i32);

///     seca_iter!(1);
///     for x in some_container.__variable_iter().iter() {
///       println!("{:?}", x);
///     }
///   }
/// );
/// ```
pub use secador_macro::secador_multi;
