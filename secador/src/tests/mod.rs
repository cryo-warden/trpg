#![cfg(test)]

mod test_single_line {
    use crate::secador;

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

mod test_multi_line {
    use crate::secador;

    secador!(
        (field, Type, other_field, OtherType),
        [
            (happy, Happy, path, Path),
            (sad, Sad, way, Way),
            (mad, Mad, route, Route),
            (glad, Glad, direction, Direction),
        ],
        {
            seca!(1);
            mod __field;

            seca!(1);
            pub use __field::__Type;

            seca!(1);
            #[derive(Debug)]
            pub struct __OtherType;

            pub struct Test {
                __seca: __2,
                pub __field: __Type,
                pub __other_field: __OtherType,
            }

            impl Test {
                pub fn new_test(__seca: __2, __field: __Type, __other_field: __OtherType) -> Test {
                    Test {
                        __seca: __2,
                        __field: __Type::init(__field),
                        __other_field,
                    }
                }
            }
        }
    );

    #[test]
    fn compiles() {
        let test = Test::new_test(Happy, Path, Sad, Way, Mad, Route, Glad, Direction);
        println!("{:?}", test.direction);
        println!("{:?}", test.glad);
        println!("{:?}", test.happy);
        println!("{:?}", test.mad);
        println!("{:?}", test.path);
        println!("{:?}", test.route);
        println!("{:?}", test.sad);
        println!("{:?}", test.way);
    }
}

mod test_attr {
    use crate::secador;

    secador!((attr, arg), [(derive, Clone), (derive, Debug),], {
        #[seca(1)]
        #[__attr(__arg)]
        pub struct Test(pub u64);
    });

    #[test]
    fn compiles() {
        let test = Test(12);
        println!("{:?}", test.0.clone());
        println!("{:?}", test.clone());
    }
}

mod test_secador_multi {
    use crate::secador_multi;

    secador_multi!(
        seca!((var, ty, init), [(A, u64, 8), (B, u32, 13),]), // Intentional extra comma.
        custom_named_seca!((var, ty, init), [(Z, u64, 8), (Y, u32, 13)]),
        {
            seca!(1);
            const __var: __ty = __init;
            custom_named_seca!(1);
            const __var: __ty = __init;

            #[test]
            fn compiles() {
                let _ = A;
                let _ = B;
                let _ = Y;
                let _ = Z;
            }
        }
    );
}
