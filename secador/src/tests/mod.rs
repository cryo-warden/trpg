#![cfg(test)]

mod test1 {
    use secador_macro::secador;

    secador!(
        (field, Type),
        [(happy, Happy), (sad, Sad), (mad, Mad), (glad, Glad),],
        {
            mod origin;
            seca!(1);
            mod __field;

            pub use origin::Origin;
            seca!(1);
            pub use __field::__Type;

            pub struct Test {
                __seca: __1,
                __field: __Type,
            }

            impl Test {
                seca!(1);
                pub fn __field(&self) -> &__Type {
                    &self.__field
                }
                pub fn new_test(origin: Origin, __seca: __1, __field: __Type) -> Test {
                    Test {
                        __seca: __1,
                        __field: __Type::init(&origin, __field),
                    }
                }
            }
        }
    );

    #[test]
    fn compiles() {
        let test = Test::new_test(Origin, Happy, Sad, Mad, Glad);
        test.happy();
        test.sad();
        test.mad();
        test.glad();
    }
}

// mod test2 {
//     use secador_macro::secador;

//     secador!(
//         (field, Type, other_field, OtherType),
//         [
//             (happy, Happy, path, Path),
//             (sad, Sad, way, Way),
//             (mad, Mad, route, Route),
//             (glad, Glad, direction, Direction),
//         ],
//         {
//             seca!(1);
//             mod __field;

//             pub struct Test {
//                 __seca: __2,
//                 __field: __Type,
//                 __other_field: __OtherType,
//             }

//             pub fn new_test(__seca: __2, __field: __Type, __other_field: __OtherType) -> Test {
//                 Test {
//                     __seca: __2,
//                     __field,
//                     __other_field,
//                 }
//             }
//         }
//     );
// }
